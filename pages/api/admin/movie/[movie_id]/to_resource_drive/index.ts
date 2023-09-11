/**
 * @file 管理后台/归档指定电影到另一云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { Drive } from "@/domains/drive";
import {
  ArticleLineNode,
  ArticleListItemNode,
  ArticleListNode,
  ArticleSectionNode,
  ArticleTextNode,
} from "@/domains/article";
import { MovieProfileRecord, MovieRecord, ParsedMovieRecord } from "@/domains/store/types";
import { BaseApiResp, Result } from "@/types";
import { FileType } from "@/constants";
import { app, store } from "@/store";
import { response_error_factory } from "@/utils/backend";
import { build_tv_name, parse_filename_for_video } from "@/utils/parse_filename_for_video";
import { AliyunBackupDriveClient } from "@/domains/aliyundrive";
import { DriveAnalysis } from "@/domains/analysis";

type TheFilePrepareTransfer = {
  id: string;
  file_id: string;
  name: string;
  file_name: string;
  parent_paths: string;
  type: FileType;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { movie_id: id } = req.query as Partial<{ movie_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id || id === "undefined") {
    return e(Result.Err("缺少电影 id"));
  }
  const user = t_res.data;
  const { id: user_id } = user;
  const movie = await store.prisma.movie.findFirst({
    where: {
      id,
      user_id,
    },
    include: {
      profile: true,
      parsed_movies: true,
    },
  });
  if (movie === null) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { name, original_name } = movie.profile;
  const mvoie_name = name || original_name;
  if (!mvoie_name) {
    return e(Result.Err(`电影 ${id} 没有名称，请先更新该电视剧详情`));
  }
  const job_res = await Job.New({
    unique_id: movie.id,
    desc: `移动电影 '${mvoie_name}' 到资源盘`,
    type: TaskTypes.MovieTransfer,
    user_id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run(
    movie: MovieRecord & {
      profile: MovieProfileRecord;
      parsed_movies: ParsedMovieRecord[];
    }
  ) {
    const all_parsed_movies = movie.parsed_movies;
    const parsed_movie_groups_by_drive_id: Record<string, TheFilePrepareTransfer[]> = {};
    const the_files_in_target_drive: TheFilePrepareTransfer[] = [];
    for (let i = 0; i < all_parsed_movies.length; i += 1) {
      (() => {
        const parsed_movie = all_parsed_movies[i];
        const { id, file_id, file_name, parent_paths, drive_id } = parsed_movie;
        const payload = {
          id,
          name: file_name,
          file_id,
          file_name,
          parent_paths,
          type: FileType.File,
        };
        parsed_movie_groups_by_drive_id[drive_id] = parsed_movie_groups_by_drive_id[drive_id] || [];
        parsed_movie_groups_by_drive_id[drive_id].push(payload);
      })();
    }
    const drive_ids_of_parsed_episodes = Object.keys(parsed_movie_groups_by_drive_id);
    // 这里遍历云盘，将每个云盘内、该 电影 需要归档的文件进行整理
    for (let i = 0; i < drive_ids_of_parsed_episodes.length; i += 1) {
      await (async () => {
        const source_drive_id = drive_ids_of_parsed_episodes[i];
        const the_files_prepare_transfer = parsed_movie_groups_by_drive_id[source_drive_id];
        const source_drive_res = await Drive.Get({ id: source_drive_id, user, store });
        if (source_drive_res.error) {
          return;
        }
        const source_drive = source_drive_res.data;
        if (the_files_prepare_transfer.length === 0) {
          job.output.write(
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: `云盘 '${source_drive.name}' 要移动的文件数为 0`,
                }),
              ],
            })
          );
          return;
        }
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `从云盘 '${source_drive.name}' 移动的文件数为 ${the_files_prepare_transfer.length}`,
              }),
            ],
          })
        );
        const archive_res = await archive_movie_files({
          job,
          drive: source_drive,
          user,
          files: the_files_prepare_transfer,
          profile: movie.profile,
        });
        if (archive_res.error) {
          job.output.write(
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: `归档电影 '${mvoie_name}' 失败`,
                }),
                new ArticleTextNode({
                  text: archive_res.error.message,
                }),
              ],
            })
          );
          return;
        }
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: "移动至资源盘",
              }),
            ],
          })
        );
        const created_folders = archive_res.data;
        if (source_drive.client instanceof AliyunBackupDriveClient) {
          const transfer_res = await source_drive.client.move_file_to_resource_drive({
            file_ids: created_folders.map((folder) => {
              return folder.file_id;
            }),
          });
          if (transfer_res.error) {
            job.output.write(
              new ArticleLineNode({
                children: [
                  new ArticleTextNode({
                    text: "移动文件到资源盘失败，因为",
                  }),
                  new ArticleTextNode({
                    text: transfer_res.error.message,
                  }),
                ],
              })
            );
            return;
          }
          const target_drive_res = await Drive.GetByUniqueId({
            id: source_drive.client.resource_drive_id,
            user,
            store,
          });
          if (target_drive_res.error) {
            return;
          }
          const target_drive = target_drive_res.data;
          const r3 = await DriveAnalysis.New({
            drive: target_drive,
            store,
            user,
            tmdb_token: user.settings.tmdb_token,
            assets: app.assets,
            on_print(v) {
              job.output.write(v);
            },
            on_finish() {
              job.output.write(
                new ArticleLineNode({
                  children: [
                    new ArticleTextNode({
                      text: "完成目标云盘转存后的文件索引",
                    }),
                  ],
                })
              );
            },
          });
          if (r3.error) {
            return;
          }
          const analysis = r3.data;
          await analysis.run(
            created_folders.map((folder) => {
              const { file_name } = folder;
              return {
                name: [target_drive.profile.root_folder_name, , file_name].join("/"),
                type: "folder",
              };
            })
          );
        }
      })();
    }
    job.output.write(
      new ArticleLineNode({
        children: [
          new ArticleTextNode({
            text: "完成不同云盘间移动",
          }),
          new ArticleTextNode({
            text: "在同一云盘需要移动的文件数为",
          }),
          new ArticleTextNode({
            text: the_files_in_target_drive.length.toString(),
          }),
        ],
      })
    );
    job.finish();
  }
  run(movie);
  res.status(200).json({
    code: 0,
    msg: "开始移动",
    data: {
      job_id: job.id,
    },
  });
}

/**
 * 归档指定云盘的指定文件
 * 将剧集源文件重命名，并移动到一个新的文件夹中
 * 返回创建好的文件夹列表 Record<season_number, {
 * // 创建的文件夹 id
 * file_id: string;
 * // 创建的文件夹 id
 * // 文件夹内包含的文件
 * file_ids: string[];
 * }>
 */
async function archive_movie_files(body: {
  job: Job;
  drive: Drive;
  user: User;
  files: TheFilePrepareTransfer[];
  profile: MovieProfileRecord;
}) {
  const { files, profile, drive, job, user } = body;
  type CreatedFolder = {
    file_id: string;
    file_name: string;
    file_ids: {
      file_id: string;
    }[];
  };
  const created_folders: Record<string, CreatedFolder> = {};
  const errors: {
    file_id: string;
    tip: string;
  }[] = [];
  for (let j = 0; j < files.length; j += 1) {
    await (async () => {
      const parsed_episode = files[j];
      const { file_id, file_name } = parsed_episode;
      const { name, original_name, air_date } = profile;
      if (!name) {
        // 这种情况几乎没有
        errors.push({
          file_id,
          tip: "电影没有正确的名称",
        });
        return;
      }
      const { resolution, source, encode, voice_encode, type } = parse_filename_for_video(
        file_name,
        ["resolution", "source", "encode", "voice_encode", "type"],
        user.get_filename_rules()
      );
      const movie_name_with_pinyin = build_tv_name({ name, original_name });
      const air_date_of_year = (() => {
        if (!air_date) {
          return "";
        }
        return dayjs(air_date).year();
      })();
      const new_name = [
        movie_name_with_pinyin,
        air_date_of_year,
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
                text: `将文件「${file_name}」名字修改为「${new_name}」`,
              }),
            ],
          })
        );
        const rename_res = await drive.client.rename_file(file_id, new_name);
        if (rename_res.error) {
          // errors.push({
          //   file_id,
          //   tip: rename_res.error.message,
          // });
          return;
        }
      }
      const movie_folder_name = [movie_name_with_pinyin, air_date_of_year].join(".");
      const new_folder_parent_path = [drive.profile.root_folder_name, movie_folder_name].join("/");
      const season_folder_res = await (async () => {
        if (created_folders[movie_folder_name]) {
          const { file_id, file_name } = created_folders[movie_folder_name];
          return Result.Ok({
            file_id,
            name: file_name,
          });
        }
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `创建新文件夹 '${movie_folder_name}' 存放格式化后的视频文件`,
              }),
            ],
          })
        );
        const existing_res = await drive.client.existing(drive.profile.root_folder_name!, movie_folder_name);
        if (existing_res.error) {
          return Result.Err(existing_res.error.message);
        }
        if (existing_res.data) {
          return Result.Ok({
            file_id: existing_res.data.file_id,
            name: movie_folder_name,
          });
        }
        const r2 = await drive.client.add_folder({
          parent_file_id: drive.profile.root_folder_id!,
          name: movie_folder_name,
        });
        if (r2.error) {
          return Result.Err(r2.error.message);
        }
        const created_season_folder_file_id = r2.data.file_id;
        const r3 = await store.add_file({
          file_id: created_season_folder_file_id,
          name: movie_folder_name,
          parent_file_id: drive.profile.root_folder_id!,
          parent_paths: drive.profile.root_folder_name!,
          type: FileType.Folder,
          drive_id: drive.id,
          user_id: user.id,
        });
        if (r3.error) {
          console.log("创建本地文件记录失败", r3.error.message);
        }
        return Result.Ok({
          file_id: created_season_folder_file_id,
          name: movie_folder_name,
        });
      })();
      if (season_folder_res.error) {
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `创建文件夹 '${movie_folder_name}' 失败，因为 ${season_folder_res.error.message}`,
              }),
            ],
          })
        );
        errors.push({
          file_id,
          tip: `创建文件夹 '${movie_folder_name}' 失败，因为 ${season_folder_res.error.message}`,
        });
        return;
      }
      const season_folder = season_folder_res.data;
      created_folders[movie_folder_name] =
        created_folders[movie_folder_name] ||
        ({
          file_id: season_folder.file_id,
          file_name: season_folder.name,
          file_ids: [],
        } as CreatedFolder);
      created_folders[movie_folder_name].file_ids.push({ file_id });
      await store.prisma.parsed_episode.updateMany({
        where: {
          file_id,
        },
        data: {
          parent_file_id: season_folder.file_id,
          parent_paths: new_folder_parent_path,
          file_name: new_name,
        },
      });
      job.output.write(
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: `更新源文件信息，${file_id} -> ${season_folder.file_id}/${new_name}`,
            }),
          ],
        })
      );
      await store.prisma.file.updateMany({
        where: {
          file_id,
        },
        data: {
          parent_file_id: season_folder.file_id,
          parent_paths: new_folder_parent_path,
          name: new_name,
        },
      });
    })();
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
    const exceed_res = await drive.is_exceed_capacity();
    if (exceed_res.data === false) {
      const move_res = await drive.client.move_files_to_folder({
        files: file_ids,
        target_folder_id: file_id,
      });
      if (move_res.error) {
        errors.push({
          file_id,
          tip: `移动文件到文件夹失败, ${move_res.error.message}`,
        });
      }
    }
  }
  if (errors.length !== 0) {
    return Result.Err(errors.join("\n"), 0, errors);
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
