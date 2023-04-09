/**
 * @file 获取 tv 详情，包括季、集等信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import {
  exchange_user_id,
  parse_token,
  response_error_factory,
} from "@/utils/backend";
import { store } from "@/store/sqlite";
import { get_tv_profile_with_first_season_by_id } from "@/domains/walker/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("请传入 id 参数");
  }
  const t_res = parse_token(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const id_res = await exchange_user_id(t_res.data);
  if (id_res.error) {
    return e(id_res);
  }
  const { id: user_id } = id_res.data;
  const r = await get_tv_profile_with_first_season_by_id(id, { user_id }, store);
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
