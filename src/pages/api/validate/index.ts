/**
 * @file 成员通过 token 登录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Result } from "@/domains/result/index";
import { Member } from "@/domains/user/member";
import { response_error_factory } from "@/utils/server";
import { compare_versions_with_timestamp } from "@/utils/index";
import { __VERSION__ } from "@/constants/index";

export default async function v0_validate_index(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const headers = req.headers as Partial<{ "client-version": string; authorization: string }>;
  if (!headers["client-version"]) {
    return e(Result.Err("版本过旧请点击右上角刷新页面"));
  }
  const need_update = compare_versions_with_timestamp(headers["client-version"], __VERSION__);
  if (need_update === -1) {
    return e(Result.Err("版本过旧请更新", 800));
  }
  const { authorization } = headers;
  if (authorization) {
    const t_res = await Member.New(authorization, store);
    if (t_res.error) {
      return e(t_res);
    }
    const member = t_res.data;
    return res.status(200).json({
      code: 0,
      msg: "",
      data: {
        id: member.id,
        email: member.email,
        token: member.token,
      },
    });
  }
  const { token } = req.body as Partial<{ token: string }>;
  if (!token) {
    return e(Result.Err("缺少 token", 900));
  }
  const t2_res = await Member.Validate(token, store);
  if (t2_res.error) {
    return e(t2_res);
  }
  const { id, token: real_token, email } = t2_res.data;
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id,
      email,
      token: real_token,
    },
  });
}
