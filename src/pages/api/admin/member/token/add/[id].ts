/**
 * @file 给指定成员增加凭证
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { response_error_factory } from "@/utils/server";

export default async function v0_admin_member_token_add(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: member_id } = req.body as Partial<{
    id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!member_id) {
    return e("缺少成员 id");
  }
  const { id: user_id } = t_res.data;
  const member_res = await store.find_member({ id: member_id, user_id });
  if (member_res.error) {
    return e(member_res);
  }
  if (!member_res.data) {
    return e("没有匹配的成员记录");
  }
  const token_res = await User.Token({ id: member_id });
  if (token_res.error) {
    return e(token_res);
  }
  const token = token_res.data;
  const r = await store.add_member_link({
    member_id: member_id,
    token,
    used: 0,
  });
  if (r.error) {
    return e(r);
  }
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id: r.data.id,
      token,
    },
  });
}
