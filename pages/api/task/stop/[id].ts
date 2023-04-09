/**
 * @file 终止一个异步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store/sqlite";

const { find_async_task, update_async_task } = store;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{
    id: string;
  }>;
  if (!id) {
    return e("Missing id");
  }
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const existing_task_resp = await find_async_task({ id, user_id });
  if (existing_task_resp.error) {
    return e(existing_task_resp);
  }
  if (!existing_task_resp.data) {
    return e("Task not existing");
  }
  const { status } = existing_task_resp.data;
  if (status !== "Running") {
    return e("The task isn't running");
  }
  const r2 = await update_async_task(id, {
    need_stop: 1,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
