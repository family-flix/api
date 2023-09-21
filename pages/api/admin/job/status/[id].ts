/**
 * @file 获取异步任务详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Job } from "@/domains/job";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少任务 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const job_res = await Job.Get({ id, user_id, store });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  // if (job.is_to_long()) {
  //   await job.pause({ force: true });
  //   return e("任务耗时过长，自动中止");
  // }
  res.status(200).json({ code: 0, msg: "获取任务状态成功", data: job.profile });
}
