/**
 * @file 全量索引云盘
 * 支持传入文件夹 id 表示仅索引该文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { TaskTypes } from "@/domains/job/constants";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { Job } from "@/domains/job";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id } = req.body as Partial<{
    drive_id: string;
  }>;
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
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  if (!drive.has_root_folder()) {
    return e(Result.Err("请先设置索引目录", 30001));
  }
  const job_res = await Job.New({
    desc: `索引云盘「${drive.name}」`,
    type: TaskTypes.DriveAnalysis,
    unique_id: drive.id,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  const r2 = await DriveAnalysis.New({
    drive,
    store,
    user,
    assets: app.assets,
    unique_id: job.id,
    on_print(v) {
      job.output.write(v);
    },
    on_error(err) {
      job.throw(err);
    },
  });
  if (r2.error) {
    return e(r2.error.message);
  }
  const analysis = r2.data;
  job.on_pause(() => {
    analysis.stop();
  });
  analysis.on_percent((percent) => {
    job.update_percent(percent);
  });
  // console.log("[API]admin/drive/analysis/[id].ts - before analysis.run");
  async function run() {
    await analysis.run();
    job.output.write_line(["索引完成"]);
    job.finish();
  }
  run();
  res.status(200).json({
    code: 0,
    msg: "开始索引任务",
    data: {
      job_id: job.id,
    },
  });
}
