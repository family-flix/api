/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store";
import { Member } from "@/domains/user/member";
import { response_error_factory } from "@/utils/server";

export default async function v2_wechat_mine_update_email(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { email } = req.body as Partial<{ email: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const r = await user.update_credential_email({ email });
  if (r.error) {
    return e(r);
  }
  return res.status(200).json({ code: 0, msg: "更新成功", data: null });
}
