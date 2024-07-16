/**
 * @file 管理后台/获取集合详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ScheduleTask } from "@/domains/schedule/v2";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_collection_refresh_media_rank(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const schedule = new ScheduleTask({ app, store });
  const r = await schedule.update_media_rank({ user, store });
  return res.status(200).json({ code: 0, msg: "", data: null });
}
