/**
 * @file 刮削指定 tv
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { search_special_tv_in_tmdb_then_update_tv } from "@/domains/walker/search_tv_in_tmdb_then_update_tv";
import { store } from "@/store";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少 id 参数");
  }
  const t_res = parse_token(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const tv_res = await store.find_tv({ id, user_id });
  if (tv_res.error) {
    return e(tv_res);
  }
  if (!tv_res.data) {
    return e("No matched record of tv");
  }
  const { id: tv_id, name, original_name, correct_name } = tv_res.data;
  const r = await search_special_tv_in_tmdb_then_update_tv({
    id: tv_id,
    name,
    original_name,
    correct_name,
    store: store.operation,
    token: process.env.TMDB_TOKEN,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
