/**
 * @file 获取异步任务详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { Job } from "@/domains/job";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少任务 id"));
  }
  const user = t_res.data;
  const job_res = await Job.Get({ id, user_id: user.id, app, store });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  const r = await job.fetch_profile();
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const data = r.data;
  res.status(200).json({ code: 0, msg: "", data });
}
