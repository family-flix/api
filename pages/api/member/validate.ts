/**
 * @file 校验成员授权 token
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { token } = req.body as Partial<{ token: string }>;
  if (!token) {
    return e("Missing auth token");
  }
  if (authorization) {
    const user_token_res = parse_token(authorization);
    if (user_token_res.error) {
      return e(user_token_res);
    }
    // 自己已登录，访问另一个授权链接，不消耗该授权链接
    return res.status(200).json({
      code: 0,
      msg: "",
      data: {
        is_member: true,
        token: authorization,
      },
    });
  }
  const link_resp = await store.find_member_link({ token });
  if (link_resp.error) {
    return e(link_resp);
  }
  if (!link_resp.data) {
    return e("No matched member token");
  }
  const member_token = link_resp.data;
  // if (member_token.used) {
  //   res.status(200).json({
  //     code: 0,
  //     msg: "",
  //     data: {
  //       is_member: true,
  //       token,
  //     },
  //   });
  //   return;
  // }
  const member_token_resp = parse_token(token);
  if (member_token_resp.error) {
    return e(member_token_resp);
  }
  const { member_id } = member_token_resp.data;
  const member_r = await store.find_member({ id: member_id });
  if (member_r.error) {
    return e(member_r);
  }
  if (!member_r.data) {
    return e("No matched member");
  }
  const r2 = await store.update_member_link(member_token.id, {
    used: 1,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      is_member: true,
      token,
    },
  });
}
