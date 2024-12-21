/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/domains/result";
import { AlipanRefreshTokenProvider } from "~/src/domains/alipan_token_provider";
import { response_error_factory } from "@/utils/server";

export default async function v2_alipan_get_qrcode(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const $provider = new AlipanRefreshTokenProvider();
  const r = await $provider.generateQRCode();
  if (r.error) {
    return e(r);
  }
//   console.log("[API]v2/alipan/get_qrcode", r.data);
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      ...r.data,
      url: `https://www.alipan.com/o/oauth/authorize?sid=${r.data.sid}`,
    },
  });
}
