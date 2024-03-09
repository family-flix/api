/**
 * @file 终止一个索引任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store/index";
import { User } from "@/domains/user/index";
import { Job } from "@/domains/job";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types/index";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, force = "0" } = req.query as Partial<{
    id: string;
    /** 强制中止（如果不传，仅仅是标志该任务需要中止，由索引逻辑来进行真正的中止） */
    force: string;
  }>;
  if (!id) {
    return e(Result.Err("缺少任务 id 参数"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const job_res = await Job.Get({ id, user_id: user.id, app, store });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  await job.pause();
  res.status(200).json({ code: 0, msg: "中止索引任务成功", data: null });
}
