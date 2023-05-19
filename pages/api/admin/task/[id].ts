/**
 * @file 获取异步任务详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { TaskStatus } from "@/domains/walker/constants";

const { find_task: find_async_task, update_task: update_async_task } = store;

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少任务 id");
  }
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const r1 = await find_async_task({ id, user_id });
  if (r1.error) {
    return e(r1);
  }
  if (!r1.data) {
    return e("没有匹配的任务记录");
  }
  const { status, created } = r1.data;
  if (status === TaskStatus.Running && dayjs(created).add(15, "minute").isBefore(dayjs())) {
    await update_async_task(id, {
      need_stop: 1,
      status: TaskStatus.Paused,
    });
    return e("任务耗时过长，自动中止");
  }
  res.status(200).json({ code: 0, msg: "", data: r1.data });
}