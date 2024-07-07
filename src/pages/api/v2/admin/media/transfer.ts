/**
 * @file 管理后台/归档指定影视剧并移动到指定云盘
 * 1、归档的意思是重命名、移动到同一个文件夹
 * 如 Name/S01/E01.xxx.mp4，归档后，变成 Name.S01/Name.S01E01.mp4
 * 极端情况下，一部电视剧的剧集可能在不同盘内
 * 2、通过创建分享，转存的方式，可以将 A 盘的文件夹，「移动」到 B 盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Job, TaskTypes } from "@/domains/job/index";
import { Drive } from "@/domains/drive/v2";
import { AliyunDriveClient } from "@/domains/clients/alipan";
import { MediaSourceProfileRecord, MediaSourceRecord, ParsedMediaSourceRecord } from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { archive_media_files, TheFilePrepareTransferV2 } from "@/domains/clients/alipan/utilsV2";
import { Result } from "@/domains/result/index";
import { FileType, MediaTypes } from "@/constants/index";
import { response_error_factory } from "@/utils/server";
import { padding_zero, sleep } from "@/utils/index";

export default async function v2_admin_media_transfer(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id, to_drive_id } = req.body as Partial<{
    media_id: string;
    to_drive_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少电视剧季 id"));
  }
  if (!to_drive_id) {
    return e(Result.Err("缺少目标云盘 id"));
  }
  const media = await store.prisma.media.findFirst({
    where: {
      id: media_id,
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
  const to_drive_res = await Drive.Get({ id: to_drive_id, user, store });
  if (to_drive_res.error) {
    return e(Result.Err(to_drive_res.error.message));
  }
  const to_drive = to_drive_res.data;
  if (!to_drive.has_root_folder()) {
    return e(Result.Err("请先设置目标云盘索引目录", 30001));
  }
  const to_drive_root_folder_id = to_drive.profile.root_folder_id!;
  const to_drive_root_folder_name = to_drive.profile.root_folder_name!;
  const media_payload = {
    id: media.id,
    type: media.type,
    name: media.profile.name,
    original_name: media.profile.original_name,
    air_date: media.profile.air_date,
    source_count: media.profile.source_count ?? 0,
    sources: media.media_sources,
  };
  const job_res = await Job.New({
    unique_id: to_drive.id,
    desc: `移动「${media_payload.name}」到云盘「${to_drive.name}]`,
    type: TaskTypes.MoveTV,
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
    source_count: number;
    sources: (MediaSourceRecord & {
      profile: MediaSourceProfileRecord;
      files: ParsedMediaSourceRecord[];
    })[];
  }) {
    const { sources: episodes } = season;
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
    const parsed_media_source_groups_by_drive_id: Record<string, TheFilePrepareTransferV2[]> = {};
    for (let i = 0; i < parsed_media_source_of_the_media.length; i += 1) {
      (() => {
        const parsed_media_source = parsed_media_source_of_the_media[i];
        const { id, order, file_id, file_name, parent_file_id, parent_paths, drive_id } = parsed_media_source;
        const payload: TheFilePrepareTransferV2 = {
          id,
          type: FileType.File,
          file_id,
          file_name,
          parent_file_id,
          parent_paths,
          episode_text: (() => {
            if (season.type === MediaTypes.Movie) {
              return null;
            }
            return `E${padding_zero(order)}`;
          })(),
        };
        parsed_media_source_groups_by_drive_id[drive_id] = parsed_media_source_groups_by_drive_id[drive_id] || [];
        parsed_media_source_groups_by_drive_id[drive_id].push(payload);
      })();
    }
    const drive_ids_of_parsed_episodes = Object.keys(parsed_media_source_groups_by_drive_id);
    // 这里遍历云盘，将每个云盘内、该 电视剧季 需要归档的文件进行整理
    for (let i = 0; i < drive_ids_of_parsed_episodes.length; i += 1) {
      await (async () => {
        if (!(to_drive.client instanceof AliyunDriveClient)) {
          job.output.write_line(["暂时仅 阿里云盘 支持归档"]);
          return;
        }
        const from_drive_id = drive_ids_of_parsed_episodes[i];
        const the_files_prepare_transfer = parsed_media_source_groups_by_drive_id[from_drive_id];
        if (the_files_prepare_transfer.length === 0) {
          job.output.write_line([`云盘「${from_drive_id}」要转存的文件数为 0`]);
          return;
        }
        job.output.write_line([`从云盘「${from_drive_id}」转存的文件数为 ${the_files_prepare_transfer.length}`]);
        const from_drive_res = await Drive.Get({ id: from_drive_id, user, store });
        if (from_drive_res.error) {
          job.output.write_line(["初始化源云盘失败，因为，", from_drive_res.error.message]);
          return;
        }
        const from_drive = from_drive_res.data;
        if (!(from_drive.client instanceof AliyunDriveClient)) {
          job.output.write_line(["暂时仅 阿里云盘 支持归档"]);
          return;
        }
        const prefix = `[${from_drive.name}]`;
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
          job.output.write_line([`归档「${season.name}」失败`, archive_res.error.message]);
          return;
        }
        if (from_drive_id === to_drive_id) {
          job.output.write_line([prefix, "目标云盘即当前云盘"]);
          return;
        }
        job.output.write_line([prefix, "创建分享并转存至目标云盘"]);
        const folder_in_from_drive = archive_res.data;
        const existing_res = await to_drive.client.existing(
          to_drive.profile.root_folder_id!,
          folder_in_from_drive.file_name
        );
        if (existing_res.data !== null) {
          job.output.write_line([prefix, folder_in_from_drive.file_name, "已经在目标盘"]);
          return;
        }
        const transfer_res = await from_drive.client.move_files_to_drive({
          file_ids: [folder_in_from_drive.file_id],
          target_drive_client: to_drive.client,
          target_folder_id: to_drive_root_folder_id,
        });
        if (transfer_res.error) {
          job.output.write_line([prefix, "转存分享资源失败，因为", transfer_res.error.message]);
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
    job.output.write_line(["全部归档任务完成"]);
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
