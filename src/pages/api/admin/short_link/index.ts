/**
 * @file 创建短链接
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { create_link } from "@/domains/short_link/services";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v0_admin_short_link(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url } = req.body as Partial<{ url: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!url) {
    return Result.Err("缺少链接");
  }
  const r = await create_link(url);
  if (r.error) {
    return e(r);
  }
  const short_url = r.data;
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      url: short_url,
    },
  });
}
