/**
 * @file 成员通过 token 登录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { Member } from "@/domains/user/member";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { token } = req.body as Partial<{ token: string }>;
  if (!token) {
    return e(Result.Err("缺少 token", 900));
  }
  // const t = await store.prisma.member_token.findFirst({
  //   where: {
  //     id: token,
  //   },
  // });
  // if (!t) {
  //   return e(Result.Err("该 token 不存在", 900));
  // }
  const t_res = await Member.Validate(token, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id, token: real_token } = t_res.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id,
      token: real_token,
    },
  });
}
