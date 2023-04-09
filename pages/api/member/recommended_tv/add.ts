/**
 * @file 删除播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store/sqlite";

const { add_recommended_tv, find_tv, find_member } = store;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { member_id, tv_id } = req.body as Partial<{
    member_id: string;
    tv_id: string;
  }>;
  if (!member_id) {
    return e("Missing member_id");
  }
  if (!tv_id) {
    return e("Missing tv_id");
  }
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const member_resp = await find_member({ id: member_id, owner_id: user_id });
  if (member_resp.error) {
    return e(member_resp);
  }
  if (!member_resp.data) {
    return e("No matched member");
  }
  const tv_resp = await find_tv({ id: tv_id, user_id });
  if (tv_resp.error) {
    return e(tv_resp);
  }
  if (!tv_resp.data) {
    return e("No matched tv");
  }
  const r = await add_recommended_tv({
    tv_id,
    member_id,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
