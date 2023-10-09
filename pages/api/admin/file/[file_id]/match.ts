/**
 * @file 管理后台/对指定的电视剧解析结果，尝试搜索
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";
import { MediaSearcher } from "@/domains/searcher";
import { Job, TaskTypes } from "@/domains/job";
import { FileRecord } from "@/domains/store/types";
import { FileType } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, drive_id } = req.query as Partial<{ file_id: string; drive_id: string }>;
  const { name } = req.body as Partial<{ name: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件 file_id"));
  }
  if (!name) {
    return e(Result.Err("缺少新的文件名"));
  }
  const file_res = await store.find_file({
    file_id,
    user_id: user.id,
  });
  if (file_res.error) {
    return e(file_res);
  }
  const file = file_res.data;
  if (!file) {
    return e(Result.Err("没有匹配的记录"));
  }
  const drive_res = await Drive.Get({ id: file.drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res));
  }
  const drive = drive_res.data;
  const job_res = await Job.New({
    unique_id: file_id,
    desc: "搜索指定解析结果详情",
    type: TaskTypes.SearchMedia,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  const searcher_res = await MediaSearcher.New({
    assets: app.assets,
    user,
    drive,
    store,
    on_print(v) {
      job.output.write(v);
    },
  });
  if (searcher_res.error) {
    return e(Result.Err(searcher_res.error.message));
  }
  const searcher = searcher_res.data;
  async function run(file: FileRecord) {
    if (file.type === FileType.Folder) {
      const existing_parsed_tv = await store.prisma.parsed_tv.findFirst({
        where: {
          file_id: file.file_id,
          user_id: user.id,
        },
      });
      if (existing_parsed_tv) {
        await searcher.process_parsed_tv({ parsed_tv: existing_parsed_tv });
        job.finish();
        return;
      }
    }
    if (file.type === FileType.File) {
      const existing_parsed_movie = await store.prisma.parsed_movie.findFirst({
        where: {
          file_id: file.file_id,
          user_id: user.id,
        },
      });
      if (existing_parsed_movie) {
        await searcher.process_parsed_movie({ parsed_movie: existing_parsed_movie });
        job.finish();
        return;
      }
      const existing_parsed_episode = await store.prisma.parsed_episode.findFirst({
        where: {
          file_id: file.file_id,
          user_id: user.id,
        },
        include: {
          parsed_tv: true,
        },
      });
      if (existing_parsed_episode) {
        await searcher.process_parsed_episode({
          parsed_tv: existing_parsed_episode.parsed_tv,
          parsed_episode: existing_parsed_episode,
        });
        job.finish();
        return;
      }
    }
    job.output.write_line(["该文件没有匹配的类型"]);
    job.finish();
  }
  run(file);
  res.status(200).json({ code: 0, msg: "开始搜索", data: { job_id: job.id } });
}
