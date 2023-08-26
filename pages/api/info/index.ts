/**
 * @file 获取成员自己基本信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  // const p_res = await store.find_permission_list({
  //   member_id: member.id,
  // });
  // if (p_res.error) {
  //   return e(p_res);
  // }
  // const data = {
  //   id: member.id,
  //   nickname: member.nickname,
  //   avatar: member.avatar,
  //   permissions: p_res.data.map((p) => {
  //     const { id, code } = p;
  //     return {
  //       id,
  //       code,
  //     };
  //   }),
  // };
  const data = null;
  res.status(200).json({ code: 0, msg: "", data });
}
