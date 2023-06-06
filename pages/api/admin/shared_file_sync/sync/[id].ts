/**
 * @file 执行指定同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";
import { store } from "@/store";
import { ResourceSyncTask } from "@/domains/resource_sync_task";
import { Job } from "@/domains/job";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少同步任务 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
  const task_res = await ResourceSyncTask.Get({
    id,
    user,
    store,
    TMDB_TOKEN: settings.tmdb_token,
    assets: settings.assets,
  });
  if (task_res.error) {
    return e(task_res);
  }
  const task = task_res.data;
  const {
    parsed_tv: { name, original_name },
  } = task.task;
  const job_res = await Job.New({
    unique_id: id,
    desc: `同步电视剧 '${name || original_name}' 新增影片`,
    user_id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  task.on_print((v) => {
    job.output.write(v);
  });
  task.on_finish(() => {
    job.finish();
  });
  const r = await task.run();
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: { job_id: job.id } });
}
