/**
 * @file 管理后台/将指定季移动到资源盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Job, TaskTypes } from "@/domains/job/index";
import { Drive } from "@/domains/drive/v2";
import { DriveTypes } from "@/domains/drive/constants";
import { AliyunDriveClient } from "@/domains/clients/alipan/index";
import { archive_media_files, TheFilePrepareTransferV2 } from "@/domains/clients/alipan/utilsV2";
import { MediaSourceProfileRecord, MediaSourceRecord, ParsedMediaSourceRecord } from "@/domains/store/types";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { Result } from "@/types/index";
import { FileType, MediaTypes } from "@/constants/index";
import { response_error_factory } from "@/utils/server";
import { padding_zero, sleep } from "@/utils/index";

export default async function v2_admin_media_to_resource_drive(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id: id } = req.body as Partial<{ media_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少电视剧季 id"));
  }
  const user = t_res.data;
  const media = await store.prisma.media.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      profile: true,
      media_sources: {
        include: {
          profile: true,
          files: true,
        },
      },
    },
  });
  if (media === null) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { name, original_name } = media.profile;
  const media_name = name || original_name;
  if (!media_name) {
    return e(Result.Err(`电视剧「${id}」没有名称，请先更新该电视剧详情`));
  }
  const media_payload = {
    id: media.id,
    type: media.type,
    name: media_name,
    original_name,
    air_date: media.profile.air_date,
    episode_count: media.profile.source_count ?? 0,
    episodes: media.media_sources,
  };
  const job_res = await Job.New({
    unique_id: media.id,
    desc: `移动电视剧「${media_name}」到资源盘`,
    type: TaskTypes.MoveToResourceDrive,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  async function run(season: {
    id: string;
    type: MediaTypes;
    name: string;
    original_name: string | null;
    air_date: string | null;
    episode_count: number;
    episodes: (MediaSourceRecord & {
      profile: MediaSourceProfileRecord;
      files: ParsedMediaSourceRecord[];
    })[];
  }) {
    const { episodes } = season;
    const parsed_media_source_of_the_media = episodes.reduce((total, cur) => {
      return total.concat(
        cur.files.map((parsed_episode) => {
          return {
            ...parsed_episode,
            order: cur.profile.order,
          };
        })
      );
    }, [] as (ParsedMediaSourceRecord & { order: number })[]);
    const parsed_episode_groups_by_drive_id: Record<string, TheFilePrepareTransferV2[]> = {};
    for (let i = 0; i < parsed_media_source_of_the_media.length; i += 1) {
      // 把所有 parsed_episode 按 drive_id 聚合
      const parsed_episode = parsed_media_source_of_the_media[i];
      const { id, file_id, file_name, parent_paths, parent_file_id, order, drive_id } = parsed_episode;
      const payload = {
        id,
        file_id,
        file_name,
        parent_file_id,
        parent_paths,
        type: FileType.File,
        episode_text: (() => {
          if (season.type === MediaTypes.Movie) {
            return null;
          }
          return `E${padding_zero(order)}`;
        })(),
      } as TheFilePrepareTransferV2;
      parsed_episode_groups_by_drive_id[drive_id] = parsed_episode_groups_by_drive_id[drive_id] || [];
      parsed_episode_groups_by_drive_id[drive_id].push(payload);
    }
    const drive_ids_of_parsed_episodes = Object.keys(parsed_episode_groups_by_drive_id);
    for (let i = 0; i < drive_ids_of_parsed_episodes.length; i += 1) {
      // 这里遍历云盘，将每个云盘内，该 电视剧季 关联的视频文件进行整理
      await (async () => {
        const from_drive_id = drive_ids_of_parsed_episodes[i];
        const the_files_prepare_transfer = parsed_episode_groups_by_drive_id[from_drive_id];
        const from_drive_res = await Drive.Get({ id: from_drive_id, user, store });
        if (from_drive_res.error) {
          job.output.write_line([`获取源云盘「${from_drive_id}」失败，因为`, from_drive_res.error.message]);
          return;
        }
        const from_drive = from_drive_res.data;
        if (!(from_drive.client instanceof AliyunDriveClient)) {
          job.output.write_line([`暂时仅 阿里云盘 支持移动到资源盘`]);
          return;
        }
        const prefix = `[${from_drive.name}]`;
        if (![DriveTypes.AliyunBackupDrive].includes(from_drive.type)) {
          job.output.write_line([prefix, `不是阿里云备份盘，无法移动到资源盘`]);
          return;
        }
        if (the_files_prepare_transfer.length === 0) {
          job.output.write_line([prefix, `要移动的文件数为 0`]);
          return;
        }
        job.output.write_line([prefix, `要移动的文件数为 ${the_files_prepare_transfer.length}`]);
        const from_drive_root_folder_id = from_drive.profile.root_folder_id;
        if (!from_drive_root_folder_id) {
          job.output.write_line([prefix, `未设置索引根目录，中断操作`]);
          return;
        }
        job.output.write_line([prefix, "开始归档（格式化名称）"]);
        const archive_res = await archive_media_files({
          files: the_files_prepare_transfer,
          profile: {
            type: season.type,
            name: season.name,
            original_name: season.original_name,
            air_date: season.air_date,
          },
          job,
          drive: from_drive,
          user,
          store,
        });
        if (archive_res.error) {
          job.output.write_line([prefix, `归档失败，因为`, archive_res.error.message]);
          return;
        }
        job.output.write_line([prefix, `归档成功`]);
        if (!from_drive.client.resource_drive_id) {
          job.output.write_line([prefix, "该备份盘未初始化资源盘"]);
          return;
        }
        const to_drive_res = await Drive.Get({ unique_id: from_drive.client.resource_drive_id, user, store });
        if (to_drive_res.error) {
          job.output.write_line([prefix, "初始化失败，因为", to_drive_res.error.message]);
          return;
        }
        const to_drive = to_drive_res.data;
        const to_drive_root_folder_id = to_drive.profile.root_folder_id;
        const to_drive_root_folder_name = to_drive.profile.root_folder_name;
        if (!to_drive_root_folder_id || !to_drive_root_folder_name) {
          job.output.write_line([prefix, "目标云盘未设置索引根目录"]);
          return;
        }
        const folder_in_from_drive = archive_res.data;
        if (from_drive.client.resource_drive_id !== to_drive.client.unique_id) {
          job.output.write_line([prefix, "资源盘不属于备份盘"]);
          return;
        }
        const existing_res = await to_drive.client.existing(
          to_drive.profile.root_folder_id!,
          folder_in_from_drive.file_name
        );
        if (existing_res.data !== null) {
          job.output.write_line([prefix, folder_in_from_drive.file_name, "已经在目标资源盘"]);
          return;
        }
        job.output.write_line([prefix, "将文件夹", folder_in_from_drive.file_name, "移动到目标资源盘"]);
        const transfer_res = await from_drive.client.move_file_to_resource_drive({
          file_ids: [folder_in_from_drive.file_id],
        });
        if (transfer_res.error) {
          job.output.write_line([prefix, "移动到目标资源盘失败，因为", transfer_res.error.message]);
          return;
        }
        await sleep(5000);
        job.output.write_line([prefix, "在目标云盘索引新增的文件 ", folder_in_from_drive.file_name]);
        const drive_folder_in_to_drive_r = await to_drive.client.existing(
          to_drive.profile.root_folder_id!,
          folder_in_from_drive.file_name
        );
        if (drive_folder_in_to_drive_r.error) {
          job.output.write_line([prefix, "获取目标云盘内文件夹失败", drive_folder_in_to_drive_r.error.message]);
          return;
        }
        const drive_folder_in_to_drive = drive_folder_in_to_drive_r.data;
        if (!drive_folder_in_to_drive) {
          job.output.write_line([prefix, "转存成功后，没有找到目标文件夹"]);
          return;
        }
        const r3 = await DriveAnalysis.New({
          unique_id: job.id,
          drive: to_drive,
          store,
          user,
          assets: app.assets,
          on_print(v) {
            job.output.write(v);
          },
        });
        if (r3.error) {
          job.output.write_line([prefix, "初始化索引失败，因为", r3.error.message]);
          return;
        }
        const analysis = r3.data;
        const r = await analysis.run2(
          [
            {
              file_id: drive_folder_in_to_drive.file_id,
              name: drive_folder_in_to_drive.name,
              type: FileType.Folder,
            },
          ],
          {
            async before_search() {
              return false;
            },
          }
        );
        if (r.error) {
          job.output.write_line([prefix, "索引失败，因为", r.error.message]);
          return;
        }
        await walk_model_with_cursor({
          fn(extra) {
            return store.prisma.parsed_media_source.findMany({
              where: {
                cause_job_id: job.id,
                // parent_paths: [to_drive.profile.root_folder_name!, folder_in_from_drive.file_name].join("/"),
                drive_id: to_drive.id,
                user_id: user.id,
              },
              include: {
                parsed_media: true,
              },
              orderBy: {
                created: "desc",
              },
              ...extra,
            });
          },
          async handler(data) {
            const same_file_in_from_drive = await store.prisma.parsed_media_source.findFirst({
              where: {
                file_name: data.file_name,
                parent_paths: [to_drive.profile.root_folder_name!, folder_in_from_drive.file_name].join("/"),
                drive_id: from_drive.id,
                user_id: user.id,
              },
              include: {
                parsed_media: true,
                media_source: {
                  include: {
                    profile: true,
                  },
                },
              },
            });
            if (!same_file_in_from_drive) {
              return;
            }
            await store.prisma.parsed_media_source.update({
              where: {
                id: data.id,
              },
              data: {
                media_source_id: same_file_in_from_drive.media_source_id,
              },
            });
            if (
              data.parsed_media &&
              !data.parsed_media.media_profile_id &&
              same_file_in_from_drive.parsed_media &&
              same_file_in_from_drive.parsed_media.media_profile_id
            ) {
              await store.prisma.parsed_media.update({
                where: {
                  id: data.parsed_media.id,
                },
                data: {
                  media_profile_id: same_file_in_from_drive.parsed_media.media_profile_id,
                },
              });
            }
          },
        });
        job.output.write_line([prefix, "完成目标云盘转存后的文件索引"]);
        const from_drive_episode_count = the_files_prepare_transfer.length;
        job.output.write_line([
          prefix,
          "在目标云盘搜索转存后的文件夹",
          [to_drive.profile.root_folder_name!, folder_in_from_drive.file_name].join("/"),
        ]);
        const folder_in_to_drive = await store.prisma.file.findFirst({
          where: {
            name: folder_in_from_drive.file_name,
            parent_paths: to_drive.profile.root_folder_name!,
            type: FileType.Folder,
            drive_id: to_drive.id,
            user_id: user.id,
          },
          orderBy: {
            created: "desc",
          },
        });
        if (!folder_in_to_drive) {
          job.output.write_line([
            prefix,
            "没有在目标云盘找到转存后的文件夹",
            to_drive.profile.root_folder_name!,
            folder_in_from_drive.file_name,
          ]);
          return;
        }
        job.output.write_line([prefix, "在目标云盘转存后的文件夹", JSON.stringify(folder_in_to_drive), "获取文件总数"]);
        const to_drive_episode_count = await store.prisma.file.count({
          where: {
            parent_file_id: folder_in_to_drive.file_id,
            drive_id: to_drive.id,
            user_id: user.id,
          },
        });
        if (from_drive_episode_count !== to_drive_episode_count) {
          job.output.write_line([
            prefix,
            "转存后文件数不一致，中断删除源云盘文件。",
            "源云盘有",
            String(from_drive_episode_count),
            "但目标云盘有",
            String(to_drive_episode_count),
          ]);
          return;
        }
        job.output.write_line([prefix, "开始删除源云盘视频文件"]);
        from_drive.on_print((line) => {
          job.output.write(line);
        });
        await from_drive.delete_file_or_folder_in_drive(folder_in_from_drive.file_id);
        job.output.write_line([prefix, "归档完成"]);
      })();
    }
    job.output.write_line(["所有归档任务完成"]);
    job.finish();
  }
  run(media_payload);
  return res.status(200).json({
    code: 0,
    msg: "开始转存",
    data: {
      job_id: job.id,
    },
  });
}
