/**
 * @file 管理后台/归档指定影视剧
 * 1、归档的意思是重命名、移动到同一个文件夹
 * 如 Name/S01/E01.xxx.mp4，归档后，变成 Name.S01/Name.S01E01.mp4
 * 极端情况下，一部电视剧的剧集可能在不同盘内
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { Drive } from "@/domains/drive";
import { MediaSourceProfileRecord, MediaSourceRecord, ParsedMediaSourceRecord } from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { archive_media_files, TheFilePrepareTransferV2 } from "@/domains/aliyundrive/utils";
import { BaseApiResp, Result } from "@/types";
import { FileType, MediaTypes } from "@/constants";
import { app, store } from "@/store";
import { response_error_factory } from "@/utils/server";
import { padding_zero } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
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
    return e(to_drive_res);
  }
  const to_drive = to_drive_res.data;
  if (!to_drive.has_root_folder()) {
    return e(Result.Err("请先设置目标云盘索引目录", 30001));
  }
  const to_drive_root_folder_id = to_drive.profile.root_folder_id!;
  const to_drive_root_folder_name = to_drive.profile.root_folder_name!;
  const season_payload = {
    id: media.id,
    type: media.type,
    name: media.profile.name,
    air_date: media.profile.air_date,
    episode_count: media.profile.source_count ?? 0,
    episodes: media.media_sources,
  };
  const job_res = await Job.New({
    unique_id: to_drive.id,
    desc: `移动「${season_payload.name}」到云盘「${to_drive.name}]`,
    type: TaskTypes.MoveTV,
    user_id: user.id,
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
    air_date: string | null;
    episode_count: number;
    episodes: (MediaSourceRecord & {
      profile: MediaSourceProfileRecord;
      files: ParsedMediaSourceRecord[];
    })[];
  }) {
    const { episodes } = season;
    const all_parsed_episodes_of_the_season = episodes.reduce((total, cur) => {
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
    for (let i = 0; i < all_parsed_episodes_of_the_season.length; i += 1) {
      (() => {
        const parsed_episode = all_parsed_episodes_of_the_season[i];
        const { id, order, file_id, file_name, parent_file_id, parent_paths, drive_id } = parsed_episode;
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
        parsed_episode_groups_by_drive_id[drive_id] = parsed_episode_groups_by_drive_id[drive_id] || [];
        parsed_episode_groups_by_drive_id[drive_id].push(payload);
      })();
    }
    const drive_ids_of_parsed_episodes = Object.keys(parsed_episode_groups_by_drive_id);
    // 这里遍历云盘，将每个云盘内、该 电视剧季 需要归档的文件进行整理
    for (let i = 0; i < drive_ids_of_parsed_episodes.length; i += 1) {
      await (async () => {
        const from_drive_id = drive_ids_of_parsed_episodes[i];
        const the_files_prepare_transfer = parsed_episode_groups_by_drive_id[from_drive_id];
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
        const prefix = `[${from_drive.name}]`;
        const archive_res = await archive_media_files({
          files: the_files_prepare_transfer,
          profile: {
            type: season.type,
            name: season.name,
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
        const r3 = await DriveAnalysis.New({
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
        job.output.write_line([prefix, "在目标云盘索引新增的文件"]);
        const r = await analysis.run({
          async before_search() {
            await walk_model_with_cursor({
              fn(extra) {
                return store.prisma.parsed_media_source.findMany({
                  where: {
                    parent_paths: [to_drive.profile.root_folder_name!, folder_in_from_drive.file_name].join("/"),
                    drive_id: to_drive.id,
                    user_id: user.id,
                  },
                  orderBy: {
                    created: "desc",
                  },
                  ...extra,
                });
              },
              async handler(data) {
                const same_file = await store.prisma.parsed_media_source.findFirst({
                  where: {
                    parent_paths: [to_drive.profile.root_folder_name!, folder_in_from_drive.file_name].join("/"),
                    drive_id: from_drive.id,
                    user_id: user.id,
                  },
                });
                if (!same_file) {
                  return;
                }
                await store.prisma.parsed_media_source.update({
                  where: {
                    id: data.id,
                  },
                  data: {
                    media_source_id: same_file.media_source_id,
                  },
                });
                //   if (same_file.parsed_media_id && data.parsed_media_id) {
                //     await store.prisma.parsed_media.update({
                //       where: {
                //         id: data.parsed_media_id,
                //       },
                //       data: {
                //         media_id: same_file.media_source_id,
                //       },
                //     });
                //   }
              },
            });
            return false;
          },
        });
        if (r.error) {
          job.output.write_line([prefix, "索引失败，因为", r.error.message]);
          return;
        }
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
        await from_drive.delete_file_in_drive(folder_in_from_drive.file_id);
        job.output.write_line([prefix, "归档完成"]);
      })();
    }
    job.output.write_line(["全部归档任务完成"]);
    job.finish();
  }
  run(season_payload);
  res.status(200).json({
    code: 0,
    msg: "开始转存",
    data: {
      job_id: job.id,
    },
  });
}
