/**
 * @file 仅搜索解析出的结果
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { MediaSearcher } from "@/domains/searcher";
import { Job } from "@/domains/job";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp, Result } from "@/types";
import { app, store } from "@/store";
import { TaskTypes } from "@/domains/job/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, force } = req.query as Partial<{
    id: string;
    force: string;
  }>;
  const { target_folders } = req.body as Partial<{
    target_folders: { name: string; type: string }[];
  }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
  const drive_res = await Drive.Get({ id: drive_id, user_id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (!drive.has_root_folder()) {
    return e(Result.Err("请先设置索引目录", 30001));
  }
  const job_res = await Job.New({
    desc: `云盘 '${drive.name}' 影视剧搜索详情信息`,
    type: TaskTypes.SearchMedia,
    unique_id: drive.id,
    user_id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const r2 = await MediaSearcher.New({
    drive,
    user,
    store,
    tmdb_token: settings.tmdb_token,
    force: true,
    assets: app.assets,
    on_print(v) {
      job.output.write(v);
    },
    on_finish() {
      job.finish();
    },
  });
  if (r2.error) {
    return e(r2);
  }
  const searcher = r2.data;
  searcher.run();
  res.status(200).json({
    code: 0,
    msg: "开始搜索任务",
    data: {
      job_id: job.id,
    },
  });
}
