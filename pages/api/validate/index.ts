/**
 * @file 成员通过 token 登录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { Member } from "@/domains/user/member";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { token } = req.body as Partial<{ token: string }>;
  if (!token) {
    return e("缺少 token");
  }
  const t_res = await Member.Validate(token, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id, remark, token: real_token } = t_res.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id,
      remark,
      token: real_token,
    },
  });
}
