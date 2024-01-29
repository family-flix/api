/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Administrator } from "@/domains/administrator";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";
import { ScheduleTask } from "@/domains/schedule/v2";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;

  const t_res = await Administrator.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const schedule = new ScheduleTask({ app, store });
  await schedule.update_stats_of_user(user);
  res.status(200).json({ code: 0, msg: "更新成功", data: null });
}
