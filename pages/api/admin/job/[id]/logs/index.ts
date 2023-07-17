/**
 * @file 获取任务过程中的日志
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Job } from "@/domains/job";
import { store } from "@/store";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    id,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    id: string;
    page: string;
    page_size: string;
  }>;
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
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const r = await job.fetch_lines_of_output({ page, page_size });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: r.data,
  });
}
