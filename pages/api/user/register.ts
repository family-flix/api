/**
 * @file 用户注册
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { pocket_base } from "@/store/pocketbase";
import { response_error_factory } from "@/utils/backend";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { email, password } = req.body as Partial<{
    email: string;
    password: string;
  }>;
  if (!email || !password) {
    return e("Missing required filed");
  }
  try {
    const resp = await pocket_base
      .collection("users")
      .authWithPassword(email, password);
    const {
      record: { id, username, name, avatar, verified, created },
      token,
    } = resp;
    return res.status(200).json({
      code: 0,
      msg: "",
      data: {
        id,
        username,
        name,
        email,
        avatar,
        verified,
        created,
        token,
      },
    });
  } catch (err) {
    const error = err as Error;
    return e(error.message);
  }
}
