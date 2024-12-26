/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/domains/result";
import { AlipanRefreshTokenProvider } from "@/domains/alipan_token_provider";
import { response_error_factory } from "@/utils/server";

export default async function v2_alipan_get_access_token(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { refresh_token } = req.body as Partial<{ refresh_token: string }>;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!refresh_token) {
    return e(Result.Err(new Error("缺少 refresh_token")));
  }

  const $provider = new AlipanRefreshTokenProvider();
  const r = await $provider.fetchAccessToken({ refresh_token });
  if (r.error) {
    return e(r);
  }
  return res.status(200).json({ code: 0, msg: "", data: r.data });
}
