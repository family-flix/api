/**
 * @file 仅搜索解析出的结果
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { MediaSearcher } from "@/domains/searcher/v2";
import { Job } from "@/domains/job/index";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types/index";
import { TaskTypes } from "@/domains/job/constants";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, force: force_str } = req.body as Partial<{
    id: string;
    force: string;
  }>;
  const force = to_number(force_str, 1);
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
    app,
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
    force: Boolean(force),
    assets: app.assets,
    on_print(v) {
      job.output.write(v);
    },
  });
  if (r2.error) {
    return e(r2);
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
