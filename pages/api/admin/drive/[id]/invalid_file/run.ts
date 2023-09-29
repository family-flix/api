/**
 * @file 管理后台/获取指定云盘存在问题的文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { clear_expired_files_in_drive } from "@/domains/drive";
import { Job, TaskTypes } from "@/domains/job";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const user = t_res.data;
  const job_res = await Job.New({
    unique_id: id,
    desc: "清理云盘失效文件",
    type: TaskTypes.ClearInvalidFiles,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run(id: string) {
    await clear_expired_files_in_drive({
      drive_id: id,
      user,
      store,
      on_print(node) {
        job.output.write(node);
      },
    });
    job.finish();
  }
  run(id);
  res.status(200).json({ code: 0, msg: "开始清除", data: { job_id: job.id } });
}
