/**
 * @file 用户登录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v0_admin_user_login(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { email, password } = req.body as Partial<{
    email: string;
    password: string;
  }>;
  const r = await User.GetByPassword({ email, password }, store);
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const { id, token } = r.data;
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id,
      token,
    },
  });
}
