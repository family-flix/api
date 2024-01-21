/**
 * @file 成员通过 token 登录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { Member } from "@/domains/user/member";
import { store } from "@/store";
import { compare_versions_with_timestamp } from "@/utils";
import { __VERSION__ } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const headers = req.headers as Partial<{ "client-version": string }>;
  const { token } = req.body as Partial<{ token: string }>;
  if (!token) {
    return e(Result.Err("缺少 token", 900));
  }
  if (!headers["client-version"]) {
    return e(Result.Err("版本过旧请点击右上角刷新页面"));
  }
  const need_update = compare_versions_with_timestamp(headers["client-version"], __VERSION__);
  if (need_update === -1) {
    return e(Result.Err("版本过旧请更新", 800));
  }
  const t_res = await Member.Validate(token, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id, token: real_token } = t_res.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id,
      token: real_token,
    },
  });
}
