/**
 * @file 管理后台/归档指定电影到另一云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { Drive } from "@/domains/drive";
import { archive_movie_files } from "@/domains/clients/alipan/utils";
import { ParsedMovieRecord } from "@/domains/store/types";
import { DriveAnalysis } from "@/domains/analysis";
import { BaseApiResp, Result } from "@/types";
import { FileType } from "@/constants";
import { response_error_factory } from "@/utils/server";

type TheFilePrepareTransfer = {
  id: string;
  file_id: string;
  file_name: string;
  parent_file_id: string;
  parent_paths: string;
  type: FileType;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { movie_id: id } = req.query as Partial<{ movie_id: string }>;
  const { target_drive_id: to_drive_id } = req.body as Partial<{ target_drive_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少电影 id"));
  }
  if (!to_drive_id) {
    return e(Result.Err("缺少目标云盘 id"));
  }
  const user = t_res.data;
  const movie = await store.prisma.movie.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      profile: true,
      parsed_movies: true,
    },
  });
  if (movie === null) {
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
  const { name, original_name } = movie.profile;
  const movie_name = name || original_name;
  if (!movie_name) {
    return e(Result.Err(`电影 ${id} 没有名称，请先更新该电影详情`));
  }
  const movie_payload = {
    id: movie.id,
    name: movie_name,
    original_name,
    air_date: movie.profile.air_date,
    parsed_movies: movie.parsed_movies,
  };
  const job_res = await Job.New({
    unique_id: to_drive.id,
    desc: `移动电影「${movie_name}」到云盘「${to_drive.name}]`,
    type: TaskTypes.MoveMovie,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run(movie: {
    id: string;
    name: string | null;
    original_name: string | null;
    air_date: string | null;
    parsed_movies: ParsedMovieRecord[];
  }) {
    const all_parsed_movies = movie.parsed_movies;
    const parsed_movie_groups_by_drive_id: Record<string, TheFilePrepareTransfer[]> = {};
    for (let i = 0; i < all_parsed_movies.length; i += 1) {
      (() => {
        const parsed_movie = all_parsed_movies[i];
        const { id, file_id, file_name, parent_file_id, parent_paths, drive_id } = parsed_movie;
        const payload = {
          id,
          file_id,
          file_name,
          parent_file_id,
          parent_paths,
          type: FileType.File,
        } as TheFilePrepareTransfer;
        parsed_movie_groups_by_drive_id[drive_id] = parsed_movie_groups_by_drive_id[drive_id] || [];
        parsed_movie_groups_by_drive_id[drive_id].push(payload);
      })();
    }
    const drive_ids_of_parsed_episodes = Object.keys(parsed_movie_groups_by_drive_id);
    // 这里遍历云盘，将每个云盘内、该 电影 需要归档的文件进行整理
    for (let i = 0; i < drive_ids_of_parsed_episodes.length; i += 1) {
      await (async () => {
        const from_drive_id = drive_ids_of_parsed_episodes[i];
        const the_files_prepare_transfer = parsed_movie_groups_by_drive_id[from_drive_id];
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
        const archive_res = await archive_movie_files({
          files: the_files_prepare_transfer,
          profile: {
            name: movie.name,
            original_name: movie.original_name,
            air_date: movie.air_date,
          },
          job,
          drive: from_drive,
          user,
          store,
        });
        if (archive_res.error) {
          job.output.write_line([prefix, `归档电影「${movie_name}」失败`, archive_res.error.message]);
          return;
        }
        if (from_drive_id === to_drive_id) {
          job.output.write_line([prefix, "目标云盘即当前云盘"]);
          return;
        }
        job.output.write_line([prefix, "创建分享并转存至目标云盘"]);
        const folder_in_from_drive = archive_res.data;
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
        const r = await analysis.run(
          [
            {
              name: [to_drive_root_folder_name!, folder_in_from_drive.file_name].join("/"),
              type: "folder",
            },
          ],
          {
            async before_search() {
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
                return;
              }
              const parsed_movie_in_to_drive = await store.prisma.parsed_movie.findFirst({
                where: {
                  file_id: folder_in_to_drive.file_id,
                  drive_id: to_drive.id,
                  user_id: user.id,
                },
              });
              if (!parsed_movie_in_to_drive) {
                return;
              }
              await store.prisma.parsed_movie.update({
                where: {
                  id: parsed_movie_in_to_drive.id,
                },
                data: {
                  movie_id: movie.id,
                },
              });
            },
          }
        );
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
  run(movie_payload);
  res.status(200).json({
    code: 0,
    msg: "开始转存",
    data: {
      job_id: job.id,
    },
  });
}
