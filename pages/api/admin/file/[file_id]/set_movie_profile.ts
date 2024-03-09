/**
 * @file 指定该文件是什么电影
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { FileRecord } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { Drive } from "@/domains/drive";
import { FileType } from "@/constants";
import { r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id } = req.query as Partial<{ file_id: string }>;
  const { source, unique_id } = req.body as Partial<{
    source: number;
    unique_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件 file_id"));
  }
  if (!unique_id) {
    return e(Result.Err("缺少电影详情 id"));
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
    return e(Result.Err("只有文件可以关联电影"));
  }
  const drive_res = await Drive.Get({ id: file.drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  const searcher_res = await MediaSearcher.New({
    user,
    store,
    assets: app.assets,
    on_print(v) {
      job.output.write(v);
    },
  });
  if (searcher_res.error) {
    return e(searcher_res);
  }
  const job_res = await Job.New({
    unique_id: "update_movie_and_season",
    desc: `文件[${file.name}]设置电影详情`,
    type: TaskTypes.RefreshMedia,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  const searcher = searcher_res.data;
  async function run(file: FileRecord, payload: { unique_id: string }) {
    const { unique_id } = payload;
    const movie_profile_res = await searcher.get_movie_profile_with_tmdb_id({ tmdb_id: Number(unique_id) });
    if (movie_profile_res.error) {
      job.output.write_line(["获取电影详情失败", movie_profile_res.error.message]);
      job.finish();
      return;
    }
    const parsed_episode = await store.prisma.parsed_episode.findFirst({
      where: {
        file_id: file.file_id,
        user_id: user.id,
      },
    });
    if (parsed_episode) {
      await store.prisma.parsed_episode.delete({ where: { id: parsed_episode.id } });
    }
    const movie_profile = movie_profile_res.data;
    const movie = await (async () => {
      const ex = await store.prisma.movie.findFirst({
        where: {
          profile_id: movie_profile.id,
          user_id: user.id,
        },
      });
      if (ex) {
        return ex;
      }
      return store.prisma.movie.create({
        data: {
          id: r_id(),
          profile_id: movie_profile.id,
          user_id: user.id,
        },
      });
    })();
    const existing = await store.prisma.parsed_movie.findFirst({
      where: {
        file_id: file.file_id,
        user_id: user.id,
      },
    });
    if (existing) {
      await store.prisma.parsed_movie.update({
        where: {
          id: existing.id,
        },
        data: {
          movie_id: movie.id,
        },
      });
      job.finish();
      return existing;
    }
    job.output.write_line(["创建电影解析结果"]);
    const created = await store.prisma.parsed_movie.create({
      data: {
        id: r_id(),
        name: file.name,
        file_name: file.name,
        file_id: file.file_id,
        size: file.size,
        // md5: file.md5,
        movie_id: movie.id,
        parent_file_id: file.parent_file_id,
        parent_paths: file.parent_paths,
        type: file.type,
        user_id: user.id,
        drive_id: drive.id,
      },
    });
    job.finish();
    return created;
  }
  run(file, { unique_id });
  res.status(200).json({ code: 0, msg: "设置电影详情", data: { job_id: job.id } });
}
