/**
 * @file 管理后台/归档指定文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { FileRecord, ParsedEpisodeRecord, ParsedMovieRecord, ParsedTVRecord } from "@/domains/store/types";
import { archive_movie_files, archive_season_files } from "@/domains/aliyundrive/utils";
import { MediaSearcher } from "@/domains/searcher";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";
import { Folder } from "@/domains/folder";
import { Drive } from "@/domains/drive";
import { FileType } from "@/constants";
import { DriveAnalysis } from "@/domains/analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id } = req.query as Partial<{
    file_id: string;
  }>;
  const { target_drive_id } = req.body as Partial<{
    target_drive_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件 file_id"));
  }
  if (!target_drive_id) {
    return e(Result.Err("缺少目标云盘 id"));
  }
  const file = await store.prisma.file.findFirst({
    where: {
      file_id,
      user_id: user.id,
    },
  });
  if (!file) {
    return e(Result.Err("没有匹配的记录"));
  }
  if (file.type !== FileType.File) {
    return e(Result.Err("该操作仅限文件"));
  }
  const parsed_movie = await store.prisma.parsed_movie.findFirst({
    where: {
      file_id,
      user_id: user.id,
    },
    include: {
      movie: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (!parsed_movie) {
    return e(Result.Err("没有匹配电影记录"));
  }
  if (!parsed_movie.movie_id) {
    return e(Result.Err("该文件没有关联电影解析结果"));
  }
  if (!parsed_movie.movie) {
    return e(Result.Err("该文件没有关联电影解析结果"));
  }
  const { name, original_name, air_date } = parsed_movie.movie.profile;
  const n = name || original_name;
  if (!n) {
    return e(Result.Err("剧集信息缺少名称"));
  }
  const payload = {
    movie_id: parsed_movie.movie_id,
    parsed_movie: parsed_movie,
    name: n,
    original_name,
    air_date,
  };
  const job_res = await Job.New({
    unique_id: file.id,
    desc: `文件[${file.name}]归档`,
    type: TaskTypes.ArchiveSeason,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const drive_res = await Drive.Get({ id: file.drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const from_drive = drive_res.data;
  const to_drive_res = await Drive.Get({ id: target_drive_id, user, store });
  if (to_drive_res.error) {
    return e(to_drive_res);
  }
  const to_drive = to_drive_res.data;
  async function run(payload: {
    movie_id: string;
    parsed_movie: ParsedMovieRecord;
    name: string;
    original_name: string | null;
    air_date: string | null;
  }) {
    const { parsed_movie: parsed_episode } = payload;
    const { id, file_id, name, file_name, parent_file_id, parent_paths } = parsed_episode;
    const to_drive_root_folder_id = to_drive.profile.root_folder_id;
    if (!to_drive_root_folder_id) {
      job.output.write_line(["目标云盘没有设置索引根目录"]);
      job.finish();
      return;
    }
    const created_folder_res = await archive_movie_files({
      profile: payload,
      files: [
        {
          file_id,
          file_name,
          parent_file_id,
          parent_paths,
        },
      ],
      job,
      drive: from_drive,
      user,
      store,
    });
    if (created_folder_res.error) {
      job.output.write_line(["归档失败，因为", created_folder_res.error.message]);
      job.finish();
      return;
    }
    const folder_in_from_drive = created_folder_res.data;
    const folder_in_to_drive = await (async () => {
      const existing_res = await to_drive.client.existing(
        to_drive.profile.root_folder_id!,
        folder_in_from_drive.file_name
      );
      if (existing_res.data !== null) {
        return existing_res.data;
      }
      const r = await to_drive.client.add_folder({
        parent_file_id: to_drive.profile.root_folder_id!,
        name: folder_in_from_drive.file_name,
      });
      if (r.error) {
        return null;
      }
      return r.data;
    })();
    if (folder_in_to_drive === null) {
      job.output.write_line(["目标云盘没有文件夹存放电影文件"]);
      job.finish();
      return;
    }
    const transfer_res = await from_drive.client.move_files_to_drive({
      file_ids: [file_id],
      target_drive_client: to_drive.client,
      target_folder_id: folder_in_to_drive.file_id,
    });
    if (transfer_res.error) {
      job.output.write_line(["转存分享资源失败，因为", transfer_res.error.message]);
      job.finish();
      return;
    }
    const analysis_res = await DriveAnalysis.New({
      drive: from_drive,
      user,
      store,
      assets: app.assets,
      on_print(v) {
        job.output.write(v);
      },
    });
    if (analysis_res.error) {
      job.output.write_line(["初始化索引，因为", analysis_res.error.message]);
      job.finish();
      return;
    }
    const analysis = analysis_res.data;
    await analysis.run([
      {
        name: [from_drive.profile.root_folder_name, folder_in_from_drive.file_name].join("/"),
        type: "folder",
      },
    ]);
    job.output.write_line(["完成归档"]);
    job.finish();
  }
  run(payload);
  res.status(200).json({ code: 0, msg: "移动电影文件", data: { job_id: job.id } });
}
