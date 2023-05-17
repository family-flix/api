/**
 * @file 暂停一个索引任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { store } from "@/store";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp } from "@/types";
import { TaskStatus } from "@/domains/walker/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, force = "0" } = req.query as Partial<{
    id: string;
    /** 强制中止（如果不传，仅仅是标志该任务需要中止，由索引逻辑来进行真正的中止） */
    force: string;
  }>;
  if (!id) {
    return e("缺少任务 id 参数");
  }
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const existing_task_resp = await store.find_task({ id, user_id });
  if (existing_task_resp.error) {
    return e(existing_task_resp);
  }
  if (!existing_task_resp.data) {
    return e("任务不存在");
  }
  const { status } = existing_task_resp.data;
  if (status !== TaskStatus.Running) {
    return e("该任务非运行中状态");
  }
  const r = await store.update_task(id, {
    need_stop: 1,
    status: force === "1" ? TaskStatus.Paused : TaskStatus.Running,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
