/**
 * @file 管理后台/电视剧详情
 * @deprecated
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { Job } from "@/domains/job";
import { Drive } from "@/domains/drive";
import {
  ArticleLineNode,
  ArticleListItemNode,
  ArticleListNode,
  ArticleSectionNode,
  ArticleTextNode,
} from "@/domains/article";
import { FileRecord, ParsedEpisodeRecord, TVProfileRecord } from "@/domains/store/types";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { FileType } from "@/constants";
import { parse_filename_for_video } from "@/utils/parse_filename_for_video";
import { TaskTypes } from "@/domains/job/constants";
import { get_first_letter } from "@/utils/pinyin";

type TheFilePrepareTransfer = {
  id: string;
  file_id: string;
  name: string;
  file_name: string;
  parent_paths: string;
  type: FileType;
  episode_number: string;
  season_number: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { tv_id: id } = req.query as Partial<{ tv_id: string; target_drive_id: string }>;
  const { target_drive_id } = req.body as Partial<{ target_drive_id: string }>;
  if (!id || id === "undefined") {
    return e(Result.Err("缺少电视剧 id"));
  }
  if (!target_drive_id) {
    return e(Result.Err("缺少目标云盘 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id } = user;
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
      user_id,
    },
    include: {
      play_histories: {
        include: {
          member: true,
        },
      },
      profile: true,
      seasons: {
        include: {
          profile: true,
        },
      },
      episodes: {
        include: {
          profile: true,
          parsed_episodes: true,
        },
      },
      parsed_tvs: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });
  if (tv === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const target_drive_res = await Drive.Get({ id: target_drive_id, user, store });
  if (target_drive_res.error) {
    return e(target_drive_res);
  }
  const target_drive = target_drive_res.data;
  if (!target_drive.has_root_folder()) {
    return e(Result.Err("请先设置目标云盘索引目录", 30001));
  }
  const { root_folder_id: target_drive_root_folder_id, root_folder_name: target_root_folder_name } =
    target_drive.profile;
  if (!target_drive_root_folder_id) {
    return e(Result.Err("请先设置目标云盘索引目录", 30001));
  }
  const { name, original_name } = tv.profile;
  const tv_name = name || original_name;
  if (!tv_name) {
    return e(Result.Err(`电视剧 ${id} 没有名称`));
  }
  const job_res = await Job.New({
    desc: `移动电视剧 '${tv_name}' 到云盘 '${target_drive.name}'`,
    type: TaskTypes.TVTransfer,
    unique_id: target_drive.id,
    user_id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  // const folder_groups: Record<string, string> = {};
  const { episodes } = tv;
  const parsed_episodes = episodes.reduce((total, cur) => {
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
  const the_files_in_target_drive: TheFilePrepareTransfer[] = [];
  for (let i = 0; i < parsed_episodes.length; i += 1) {
    (() => {
      const parsed_episode = parsed_episodes[i];
      const { id, file_id, file_name, parent_paths, episode_number, season_number, drive_id } = parsed_episode;
      parsed_episode_groups_by_drive_id[drive_id] = parsed_episode_groups_by_drive_id[drive_id] || [];
      if (drive_id === target_drive_id) {
        the_files_in_target_drive.push({
          id,
          name: file_name,
          file_id,
          file_name,
          parent_paths,
          type: FileType.File,
          episode_number,
          season_number,
        });
        return;
      }
      parsed_episode_groups_by_drive_id[drive_id].push({
        id,
        file_id,
        name: file_name,
        file_name,
        parent_paths,
        type: FileType.File,
        episode_number,
        season_number,
      });
    })();
  }
  const source_drive_ids = Object.keys(parsed_episode_groups_by_drive_id);

  (async () => {
    for (let i = 0; i < source_drive_ids.length; i += 1) {
      const source_drive_id = source_drive_ids[i];
      const the_files_prepare_transfer = parsed_episode_groups_by_drive_id[source_drive_id];
      if (source_drive_id === target_drive_id) {
        continue;
      }
      const source_drive_res = await Drive.Get({ id: source_drive_id, user, store });
      if (source_drive_res.error) {
        job.finish();
        continue;
      }
      if (the_files_prepare_transfer.length === 0) {
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `云盘 '${source_drive_res.data.name}' 要转存的文件数为 0`,
              }),
            ],
          })
        );
        job.finish();
        continue;
      }
      const source_drive = source_drive_res.data;
      job.output.write(
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: `从云盘 '${source_drive.name}' 转存的文件数为 ${the_files_prepare_transfer.length}`,
            }),
          ],
        })
      );
      const archive_res = await archive_files({
        files: the_files_prepare_transfer,
        tv_profile: (() => {
          const { profile, seasons } = tv;
          return {
            ...profile,
            seasons: seasons.map((s) => {
              const { season_text, profile } = s;
              return {
                season_number: season_text,
                air_date: profile.air_date,
                episode_count: profile.episode_count ?? 0,
              };
            }),
          };
        })(),
        drive: source_drive,
        job,
      });
      if (archive_res.error) {
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `归档电视剧 '${tv_name}' 失败`,
              }),
              new ArticleTextNode({
                text: archive_res.error.message,
              }),
            ],
          })
        );
        job.finish();
        continue;
      }
      job.output.write(
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: "准备移动文件到分享目录",
            }),
          ],
        })
      );
      const created_folders = archive_res.data;
      const transfer_res = await source_drive.client.move_files_to_drive({
        file_ids: created_folders.map((folder) => {
          return folder.file_id;
        }),
        target_drive_client: target_drive.client,
        target_folder_id: target_drive_root_folder_id,
      });
      if (transfer_res.error) {
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: "移动文件失败，因为",
              }),
              new ArticleTextNode({
                text: transfer_res.error.message,
              }),
            ],
          })
        );
        continue;
      }
      await store.prisma.file.updateMany({
        where: {
          file_id: {
            in: the_files_prepare_transfer.map((f) => f.file_id),
          },
        },
        data: {
          drive_id: target_drive.id,
        },
      });
      for (let j = 0; j < created_folders.length; j += 1) {
        const { file_name } = created_folders[j];
        await store.add_tmp_file({
          name: file_name,
          parent_paths: target_root_folder_name ?? "",
          type: FileType.Folder,
          user_id,
          drive_id: target_drive_id,
        });
      }
    }
    job.output.write(
      new ArticleLineNode({
        children: [
          new ArticleTextNode({
            text: "在同一云盘需要移动的文件数为",
          }),
          new ArticleTextNode({
            text: the_files_in_target_drive.length.toString(),
          }),
        ],
      })
    );
    await archive_files({
      files: the_files_in_target_drive,
      tv_profile: (() => {
        const { profile, seasons } = tv;
        return {
          ...profile,
          seasons: seasons.map((s) => {
            const { season_text, profile } = s;
            return {
              season_number: season_text,
              air_date: profile.air_date,
              episode_count: profile.episode_count ?? 0,
            };
          }),
        };
      })(),
      drive: target_drive,
      job,
    });
    job.finish();
    // const r3 = await DriveAnalysis.New({
    //   drive: target_drive,
    //   store,
    //   user,
    //   tmdb_token: settings.tmdb_token,
    //   assets: app.assets,
    //   on_print(v) {
    //     job.output.write(v);
    //   },
    //   on_finish() {
    //     job.output.write(
    //       new ArticleLineNode({
    //         children: [
    //           new ArticleTextNode({
    //             text: "索引完成",
    //           }),
    //         ],
    //       })
    //     );
    //     job.finish();
    //   },
    //   on_error() {
    //     job.finish();
    //   },
    // });
    // if (r3.error) {
    //   job.finish();
    //   return e(r3);
    // }
    // const analysis = r3.data;
    // await analysis.run(
    //   transferred_files.map((file) => {
    //     const { name, parent_paths, type } = file;
    //     return {
    //       name: [parent_paths, name].join(","),
    //       type: type === FileType.File ? "file" : "folder",
    //     };
    //   }),
    //   {
    //     force: true,
    //   }
    // );
  })();
  const { overview, poster_path, backdrop_path, original_language, first_air_date, episode_count } = tv.profile;
  const data = {
    id,
    name: tv_name,
    overview,
    poster_path,
    backdrop_path,
    original_language,
    first_air_date,
    parsed_tvs: tv.parsed_tvs,
  };
  res.status(200).json({
    code: 0,
    msg: "开始转存",
    data,
  });
}

async function find_children_files(file_id: string, descendants: FileRecord[] = []) {
  const files = await store.prisma.file.findMany({
    where: {
      parent_file_id: file_id,
    },
  });
  const folders = files.filter((file) => {
    const { type } = file;
    return type === FileType.Folder;
  });
  descendants.push(...files);
  for (const folder of folders) {
    await find_children_files(folder.file_id, descendants);
  }
  return descendants;
}

/**
 * 归档指定云盘的指定文件
 * 返回创建好的文件夹列表 Record<season_number, {
 * // 创建的文件夹 id
 * file_id: string;
 * // 创建的文件夹 id
 * // 文件夹内包含的文件
 * file_ids: string[];
 * }>
 */
async function archive_files(body: {
  drive: Drive;
  files: TheFilePrepareTransfer[];
  tv_profile: TVProfileRecord & {
    seasons: {
      season_number: string;
      air_date: string | null;
      episode_count: number;
    }[];
  };
  job: Job;
}) {
  const { files, tv_profile, drive, job } = body;
  const created_folders: Record<
    string,
    {
      file_id: string;
      file_name: string;
      file_ids: {
        file_id: string;
      }[];
    }
  > = {};
  const errors: {
    file_id: string;
    tip: string;
  }[] = [];
  for (let j = 0; j < files.length; j += 1) {
    const parsed_episode = files[j];
    const { file_id, file_name, episode_number, season_number } = parsed_episode;
    const { name, original_name, first_air_date, seasons } = tv_profile;
    if (!name) {
      // 这种情况几乎没有
      errors.push({
        file_id,
        tip: "电视剧没有正确的名称",
      });
      continue;
    }
    const first_char_pin_yin = get_first_letter(name);
    const { resolution, source, encode, voice_encode, type } = parse_filename_for_video(file_name, [
      "resolution",
      "source",
      "encode",
      "voice_encode",
      "type",
    ]);
    const n = [first_char_pin_yin, name].filter(Boolean).join(" ");
    const original_n = (() => {
      if (name && name === original_name) {
        return "";
      }
      if (!original_name) {
        return "";
      }
      return original_name;
    })().replace(/ /, "");
    const name_with_pin_yin = [n, original_n].join(".");
    const matched_season = seasons.find((s) => s.season_number === season_number);
    const air_date = (() => {
      if (matched_season && matched_season.air_date) {
        return dayjs(matched_season.air_date).year();
      }
      if (!first_air_date) {
        return "";
      }
      return dayjs(first_air_date).year();
    })();
    const new_name = [
      name_with_pin_yin,
      `${season_number}${episode_number}`,
      air_date,
      resolution,
      source,
      encode,
      voice_encode,
      type.replace(/^\./, ""),
    ]
      .filter(Boolean)
      .join(".");
    if (file_name !== new_name) {
      job.output.write(
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: `首先将文件名从 ${file_name} 格式化为 ${new_name}`,
            }),
          ],
        })
      );
      // console.log("rename", parsed_episode.file_name, new_name);
      const rename_res = await drive.client.rename_file(file_id, new_name);
      if (rename_res.error) {
        errors.push({
          file_id,
          tip: rename_res.error.message,
        });
        continue;
      }
    }
    const folder_name = [name_with_pin_yin, season_number, air_date].join(".");
    const new_parent_path = [drive.profile.root_folder_name, folder_name].join("/");
    await store.prisma.parsed_episode.updateMany({
      where: {
        file_id,
      },
      data: {
        parent_paths: new_parent_path,
        file_name: new_name,
      },
    });
    await store.prisma.file.updateMany({
      where: {
        file_id,
      },
      data: {
        parent_paths: new_parent_path,
        name: new_name,
      },
    });
    if (!created_folders[season_number] && drive.profile.root_folder_id) {
      job.output.write(
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: `创建新文件夹 '${folder_name}' 存放格式化后的视频文件`,
            }),
          ],
        })
      );
      const r2 = await drive.client.add_folder({
        parent_file_id: drive.profile.root_folder_id,
        name: folder_name,
      });
      if (r2.error) {
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `创建文件夹 '${folder_name}' 失败，因为 ${r2.error.message}`,
              }),
            ],
          })
        );
        errors.push({
          file_id,
          tip: `创建文件夹 '${folder_name}' 失败，因为 ${r2.error.message}`,
        });
        continue;
      }
      created_folders[season_number] = {
        file_id: r2.data.file_id,
        file_name: folder_name,
        file_ids: [
          {
            file_id,
          },
        ],
      };
      continue;
    }
    created_folders[season_number].file_ids.push({ file_id });
  }
  const folders = Object.keys(created_folders);
  for (let k = 0; k < folders.length; k += 1) {
    const { file_id, file_ids } = created_folders[folders[k]];
    job.output.write(
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: "移动以下文件",
              }),
              new ArticleListNode({
                children: file_ids.map((file) => {
                  return new ArticleListItemNode({
                    children: [
                      new ArticleTextNode({
                        text: file.file_id,
                      }),
                    ],
                  });
                }),
              }),
              new ArticleTextNode({
                text: `到云盘文件夹 '${file_id}'`,
              }),
            ],
          }),
        ],
      })
    );
    const move_res = await drive.client.move_files_to_folder({
      files: file_ids,
      target_folder_id: file_id,
    });
    if (move_res.error) {
      errors.push({
        file_id,
        tip: "移动文件到文件夹失败",
      });
      continue;
    }
  }
  if (errors.length !== 0) {
    return Result.Err("归档失败", 0, errors);
  }
  return Result.Ok(
    Object.keys(created_folders).map((season_number) => {
      const { file_id, file_name, file_ids } = created_folders[season_number];
      return {
        file_id,
        file_name,
        children: file_ids,
        season_number,
      };
    })
  );
}
