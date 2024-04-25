/**
 * @file 获取异步任务详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store/index";
import { User } from "@/domains/user/index";
import { Job } from "@/domains/job/index";
import { BaseApiResp, Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_task_status(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少任务 id"));
  }
  const job_res = await Job.Get({ id, user_id: user.id, app, store });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  const r = await job.fetch_profile(false);
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const { output_id, status, desc, percent, error, created, updated } = r.data;
  const data = {
    status,
    desc,
    percent,
    error,
    output_id,
    created,
    updated,
  };
  return res.status(200).json({ code: 0, msg: "获取任务状态成功", data });
}
