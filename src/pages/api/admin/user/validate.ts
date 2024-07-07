/**
 * @file 管理员校验凭证
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v0_admin_user_validate(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { token } = req.body as Partial<{ token: string }>;
  if (!token) {
    return e(Result.Err("缺少 token", 900));
  }
  const t_res = await User.New(token, store);
  if (t_res.error) {
    return e(Result.Err(t_res.error, t_res.code));
  }
  const { id } = t_res.data;
  return res.status(200).json({
    code: 0,
    msg: "校验通过",
    data: {
      id,
    },
  });
}
