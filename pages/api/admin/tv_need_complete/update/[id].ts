/**
 * @file 更新「不完善的电视剧」信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { episode_count } = req.body as Partial<{
    episode_count: string | number;
  }>;
  if (!id) {
    return e("缺少电视剧 id 参数");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const matched_res = await store.find_tv_need_complete({
    id,
    user_id,
  });
  if (matched_res.error) {
    return e(matched_res);
  }
  if (!matched_res.data) {
    return e("No matched record of tv_need_complete");
  }
  const tv = matched_res.data;
  const r = await store.update_tv_need_complete(tv.id, {
    episode_count: Number(episode_count),
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
