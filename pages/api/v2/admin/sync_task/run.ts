/**
 * @file 执行指定同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ResourceSyncTask } from "@/domains/resource_sync_task/v2";
import { Job } from "@/domains/job";
import { TaskTypes } from "@/domains/job/constants";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少同步任务 id"));
  }
  const task_res = await ResourceSyncTask.Get({
    id,
    user,
    store,
    assets: app.assets,
  });
  if (task_res.error) {
    return e(Result.Err(task_res.error.message));
  }
  const task = task_res.data;
  const { name } = task.profile;
  const job_res = await Job.New({
    unique_id: id,
    desc: `同步资源「${name}」`,
    type: TaskTypes.FilesSync,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  task.on_print((v) => {
    job.output.write(v);
  });
  job.on_pause(() => {
    task.stop();
  });
  (async () => {
    await task.run();
    job.finish();
  })();
  res.status(200).json({ code: 0, msg: "开始同步", data: { job_id: job.id } });
}