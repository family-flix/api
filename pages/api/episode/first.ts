/**
 * @file 获取指定 tv 指定 season 的第一集影片
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import {
  exchange_user_id,
  parse_token,
  response_error_factory,
} from "@/utils/backend";
import { get_first_episode } from "@/domains/walker/utils";
import { store } from "@/store/sqlite";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, season = "S01" } = req.query as Partial<{
    id: string;
    season: string;
  }>;
  if (!id) {
    return e("Missing tv id");
  }
  const t_token = parse_token(authorization);
  if (t_token.error) {
    return e(t_token);
  }
  const id_resp = await exchange_user_id(t_token.data);
  if (id_resp.error) {
    return e(id_resp);
  }
  const { id: user_id } = id_resp.data;
  const first_episode = await get_first_episode(id, season, user_id, store);
  if (first_episode.error) {
    return e(first_episode);
  }
  res.status(200).json({ code: 0, msg: "", data: first_episode.data });
}
