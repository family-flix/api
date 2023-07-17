/**
 * @file 获取异步任务详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Job } from "@/domains/job";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
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
  const r = await job.fetch_profile();
  if (r.error) {
    return e(r);
  }
  const data = r.data;
  res.status(200).json({ code: 0, msg: "", data });
}
