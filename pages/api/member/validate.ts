/**
 * @file 校验成员授权 token
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { Member } from "@/domains/user/member";

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
  const t_resp = await Member.New(authorization || token);
  if (t_resp.error) {
    return e(t_resp);
  }
  // 自己已登录，访问另一个授权链接，不消耗该授权链接
  // return res.status(200).json({
  //   code: 0,
  //   msg: "",
  //   data: {
  //     is_member: true,
  //     token: authorization,
  //   },
  // });
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
  // const r2 = await store.update_member_link(member_token.id, {
  //   used: 1,
  // });
  // if (r2.error) {
  //   return e(r2);
  // }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      is_member: true,
      token,
    },
  });
}
