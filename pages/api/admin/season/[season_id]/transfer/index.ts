/**
 * @file 管理后台/归档指定季到另一云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { Drive } from "@/domains/drive";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { EpisodeRecord, ParsedEpisodeRecord } from "@/domains/store/types";
import { DriveAnalysis } from "@/domains/analysis";
import { archive_season_files, TheFilePrepareTransfer } from "@/domains/aliyundrive/utils";
import { BaseApiResp, Result } from "@/types";
import { FileType } from "@/constants";
import { app, store } from "@/store";
import { response_error_factory } from "@/utils/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { season_id: id } = req.query as Partial<{ season_id: string; target_drive_id: string }>;
  const { target_drive_id: to_drive_id } = req.body as Partial<{ target_drive_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少电视剧季 id"));
  }
  if (!to_drive_id) {
    return e(Result.Err("缺少目标云盘 id"));
  }
  const user = t_res.data;
  const season = await store.prisma.season.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      profile: true,
      tv: {
        include: {
          profile: true,
          play_histories: {
            include: {
              member: true,
            },
          },
        },
      },
      episodes: {
        include: {
          profile: true,
          parsed_episodes: true,
        },
      },
      parsed_season: {
        orderBy: {
          season_number: "asc",
        },
      },
    },
  });
  if (season === null) {
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
  const { season_text, tv } = season;
  const { name, original_name } = tv.profile;
  const tv_name = name || original_name;
  if (!tv_name) {
    return e(Result.Err(`电视剧 ${id} 没有名称，请先更新该电视剧详情`));
  }
  const season_payload = {
    name: tv_name,
    original_name,
    season_text,
    air_date: season.profile.air_date,
    episode_count: season.profile.episode_count ?? 0,
    episodes: season.episodes,
  };
  const job_res = await Job.New({
    unique_id: to_drive.id,
    desc: `移动电视剧 '${tv_name}' ${season_text} 到云盘 '${to_drive.name}'`,
    type: TaskTypes.MoveTV,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run(season: {
    name: string;
    original_name: string | null;
    season_text: string;
    air_date: string | null;
    episode_count: number;
    episodes: (EpisodeRecord & {
      parsed_episodes: ParsedEpisodeRecord[];
    })[];
  }) {
    const { episodes } = season;
    const all_parsed_episodes_of_the_season = episodes.reduce((total, cur) => {
      const { episode_text, season_text } = cur;
      return total.concat(
        cur.parsed_episodes.map((parsed_episode) => {
          return {
            ...parsed_episode,
            episode_number: episode_text,
            season_number: season_text,
          };
        })
      );
    }, [] as ParsedEpisodeRecord[]);
    const parsed_episode_groups_by_drive_id: Record<string, TheFilePrepareTransfer[]> = {};
    for (let i = 0; i < all_parsed_episodes_of_the_season.length; i += 1) {
      (() => {
        const parsed_episode = all_parsed_episodes_of_the_season[i];
        const { id, file_id, file_name, parent_file_id, parent_paths, episode_number, season_number, drive_id } =
          parsed_episode;
        const payload = {
          id,
          file_id,
          file_name,
          parent_file_id,
          parent_paths,
          type: FileType.File,
          episode_number,
          season_number,
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
          job.output.write(
            new ArticleLineNode({
              children: [`云盘「${from_drive_id}」要转存的文件数为 0`].map(
                (text) =>
                  new ArticleTextNode({
                    text,
                  })
              ),
            })
          );
          return;
        }
        job.output.write(
          new ArticleLineNode({
            children: [`从云盘「${from_drive_id}」转存的文件数为 ${the_files_prepare_transfer.length}`].map(
              (text) =>
                new ArticleTextNode({
                  text,
                })
            ),
          })
        );
        const from_drive_res = await Drive.Get({ id: from_drive_id, user, store });
        if (from_drive_res.error) {
          return;
        }
        const from_drive = from_drive_res.data;
        from_drive.on_print((line) => {
          job.output.write(line);
        });
        const archive_res = await archive_season_files({
          job,
          drive: from_drive,
          user,
          files: the_files_prepare_transfer,
          season_profile: {
            name: season.name,
            original_name: season.original_name,
            season_text: season.season_text,
            air_date: season.air_date,
          },
          store,
        });
        if (archive_res.error) {
          job.output.write(
            new ArticleLineNode({
              children: [`归档电视剧 '${tv_name}' 失败`, archive_res.error.message].map(
                (text) =>
                  new ArticleTextNode({
                    text,
                  })
              ),
            })
          );
          return null;
        }
        if (from_drive_id === to_drive_id) {
          job.output.write(
            new ArticleLineNode({
              children: ["目标云盘即当前云盘"].map(
                (text) =>
                  new ArticleTextNode({
                    text,
                  })
              ),
            })
          );
          return;
        }
        job.output.write(
          new ArticleLineNode({
            children: ["创建分享并转存至目标云盘", archive_res.data.file_id, archive_res.data.file_name].map(
              (text) =>
                new ArticleTextNode({
                  text,
                })
            ),
          })
        );
        const folder_in_from_drive = archive_res.data;
        const transfer_res = await from_drive.client.move_files_to_drive({
          file_ids: [folder_in_from_drive.file_id],
          target_drive_client: to_drive.client,
          target_folder_id: to_drive_root_folder_id,
        });
        if (transfer_res.error) {
          job.output.write(
            new ArticleLineNode({
              children: ["转存分享资源失败，因为", transfer_res.error.message].map(
                (text) =>
                  new ArticleTextNode({
                    text,
                  })
              ),
            })
          );
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
          on_finish() {
            job.output.write(
              new ArticleLineNode({
                children: ["完成目标云盘转存后的文件索引"].map(
                  (text) =>
                    new ArticleTextNode({
                      text,
                    })
                ),
              })
            );
          },
        });
        if (r3.error) {
          return;
        }
        const analysis = r3.data;
        job.output.write(
          new ArticleLineNode({
            children: ["在目标云盘索引新增的文件"].map(
              (text) =>
                new ArticleTextNode({
                  text,
                })
            ),
          })
        );
        const r = await analysis.run([
          {
            name: [to_drive_root_folder_name!, folder_in_from_drive.file_name].join("/"),
            type: "folder",
          },
        ]);
        if (r.error) {
          job.output.write(
            new ArticleLineNode({
              children: ["索引云盘「", to_drive.name, "」失败，因为", r.error.message].map(
                (text) =>
                  new ArticleTextNode({
                    text,
                  })
              ),
            })
          );
          return;
        }
        const from_drive_episode_count = the_files_prepare_transfer.length;
        job.output.write(
          new ArticleLineNode({
            children: [
              "在目标云盘搜索转存后的文件夹",
              [to_drive.profile.root_folder_name!, folder_in_from_drive.file_name].join("/"),
            ].map(
              (text) =>
                new ArticleTextNode({
                  text,
                })
            ),
          })
        );
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
          job.output.write(
            new ArticleLineNode({
              children: [
                "没有在目标云盘找到转存后的文件夹",
                to_drive.profile.root_folder_name!,
                folder_in_from_drive.file_name,
              ].map(
                (text) =>
                  new ArticleTextNode({
                    text,
                  })
              ),
            })
          );
          return;
        }
        job.output.write(
          new ArticleLineNode({
            children: ["在目标云盘转存后的文件夹", JSON.stringify(folder_in_to_drive), "获取文件总数"].map(
              (text) =>
                new ArticleTextNode({
                  text,
                })
            ),
          })
        );
        const to_drive_episode_count = await store.prisma.file.count({
          where: {
            parent_file_id: folder_in_to_drive.file_id,
            drive_id: to_drive.id,
            user_id: user.id,
          },
        });
        if (from_drive_episode_count !== to_drive_episode_count) {
          job.output.write(
            new ArticleLineNode({
              children: [
                "转存后文件数不一致，中断删除源云盘文件。",
                "源云盘有",
                String(from_drive_episode_count),
                "但目标云盘有",
                String(to_drive_episode_count),
              ].map(
                (text) =>
                  new ArticleTextNode({
                    text,
                  })
              ),
            })
          );
          return;
        }
        job.output.write(
          new ArticleLineNode({
            children: ["删除源云盘视频文件", folder_in_from_drive.file_id].map(
              (text) =>
                new ArticleTextNode({
                  text,
                })
            ),
          })
        );
        await from_drive.delete_file_in_drive(folder_in_from_drive.file_id);
      })();
    }
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
