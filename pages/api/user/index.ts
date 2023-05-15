/**
 * @file 获取用户详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  res.status(200).json({ code: 0, msg: "", data: t_resp.data });
}
