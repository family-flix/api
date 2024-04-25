/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { Administrator } from "@/domains/administrator";
import { ScheduleTask } from "@/domains/schedule/v2";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_dashboard_refresh(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;

  const t_res = await Administrator.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const schedule = new ScheduleTask({ app, store });
  await schedule.update_stats_of_user(user);
  return res.status(200).json({ code: 0, msg: "更新成功", data: null });
}
