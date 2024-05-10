/**
 * @file 获取成员自己基本信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { response_error_factory } from "@/utils/server";

export default async function v0_wechat_info(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const data = {
    id: member.id,
    nickname: member.nickname,
    email: member.email,
    avatar: member.avatar,
    permissions: member.permissions,
  };
  return res.status(200).json({ code: 0, msg: "", data });
}
