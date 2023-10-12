/**
 * @file 创建短链接
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { create_link } from "@/domains/short_link/services";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
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
  const shorturl = r.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      url: shorturl,
    },
  });
}
