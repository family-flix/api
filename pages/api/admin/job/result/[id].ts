/**
 * @file 获取该任务详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { TaskStatus } from "@/domains/job";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

// const { find_task: find_async_task, find_tv_profile: find_searched_tv, find_tmp_tvs, find_tmp_episodes } =
//   store;

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { query } = req;
  const { id: task_id } = query as Partial<{ id: string }>;
  const r1 = await store.find_task({ id: task_id });
  if (r1.error) {
    return e(r1);
  }
  if (!r1.data) {
    return e("No matched async_task");
  }
  const { unique_id, status, desc } = r1.data;
  if (status === TaskStatus.Running) {
    return r1;
  }

  res.status(200).json({ code: 0, msg: "", data: null });
}
