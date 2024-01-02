/**
 * @file 匹配所有没有关联详情的解析记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { TaskTypes } from "@/domains/job/constants";
import { MediaSearcher } from "@/domains/searcher/v2";
import { Job } from "@/domains/job";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id, force = 1 } = req.body as Partial<{ drive_id: string; force: number }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (!drive.has_root_folder()) {
    return e(Result.Err("请先设置索引目录", 30001));
  }
  const job_res = await Job.New({
    desc: `云盘「${drive.name}」影视剧搜索详情信息`,
    type: TaskTypes.SearchMedia,
    unique_id: drive.id,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  const r2 = await MediaSearcher.New({
    drive,
    user,
    store,
    force: Boolean(force),
    assets: app.assets,
    on_print(v) {
      job.output.write(v);
    },
  });
  if (r2.error) {
    return e(Result.Err(r2.error.message));
  }
  const searcher = r2.data;
  async function run() {
    await searcher.run();
    job.finish();
  }
  run();
  res.status(200).json({
    code: 0,
    msg: "开始搜索任务",
    data: {
      job_id: job.id,
    },
  });
}
