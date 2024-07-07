/**
 * @file 用户注销登录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/store/index";
// import { pocket_base } from "@/store/pocketbase";
import { response_error_factory } from "@/utils/server";
import { Result } from "@/domains/result/index";

export default async function v0_admin_user_logout(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { email, password } = req.body as Partial<{
    email: string;
    password: string;
  }>;
  if (!email) {
    return e(Result.Err("缺少 email"));
  }
  // try {
  //   const {
  //     record: { id, username, name, avatar, verified, created },
  //     token,
  //   } = resp;
  //   return res.status(200).json({
  //     code: 0,
  //     msg: "",
  //     data: {
  //       id,
  //       username,
  //       name,
  //       email,
  //       avatar,
  //       verified,
  //       created,
  //       token,
  //     },
  //   });
  // } catch (err) {
  //   const error = err as Error;
  //   return e(error.message);
  // }
  return res.status(200).json({ code: 0, msg: "", data: null });
}
