/**
 * @file 用户注册
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { email, password } = req.body as Partial<{
    email: string;
    password: string;
  }>;
  const user = new User({ secret: process.env.TOKEN_SECRET });
  const r = await user.register({ email, password });
  if (r.error) {
    return e(r);
  }
  const { id, token } = r.data;
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id,
      email,
      token,
    },
  });
}
