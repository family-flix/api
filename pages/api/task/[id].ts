/**
 * @file 获取异步任务详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

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
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("Missing async_task_id in task/[id].ts");
  }
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const r1 = await find_async_task({ id, user_id });
  if (r1.error) {
    return e(r1);
  }
  if (!r1.data) {
    return e("No matched async task");
  }
  const { status, created } = r1.data;
  if (
    status === "Running" &&
    dayjs(created).add(15, "minute").isBefore(dayjs())
  ) {
    await update_async_task(id, {
      need_stop: 1,
      status: "Pause",
    });
    return e("The task take too long time");
  }
  res.status(200).json({ code: 0, msg: "", data: r1.data });
}
