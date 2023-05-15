/**
 * @file 给指定成员添加推荐电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

// const { add_recommended_tv, find_tv, find_member } = store;

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
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const member_resp = await store.find_member({ id: member_id, user_id });
  if (member_resp.error) {
    return e(member_resp);
  }
  if (!member_resp.data) {
    return e("No matched member");
  }
  const tv_resp = await store.find_tv({ id: tv_id, user_id });
  if (tv_resp.error) {
    return e(tv_resp);
  }
  if (!tv_resp.data) {
    return e("No matched tv");
  }
  const r = await store.add_recommended_tv({
    tv_id,
    member_id,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
