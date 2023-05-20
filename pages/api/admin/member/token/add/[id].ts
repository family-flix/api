/**
 * @file 给指定成员增加凭证
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{
    id: string;
  }>;
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  if (!id) {
    return e("缺少成员 id");
  }
  const { id: user_id } = t_resp.data;
  const member_res = await store.find_member({ id, user_id });
  if (member_res.error) {
    return e(member_res);
  }
  if (!member_res.data) {
    return e("没有匹配的成员记录");
  }
  const token_res = await User.Token({ id });
  if (token_res.error) {
    return e(token_res);
  }
  const token = token_res.data;
  // const link = `/?token=${token}`;
  const r = await store.add_member_link({
    member_id: id,
    token,
    used: 0,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id: r.data.id,
      // link,
      token,
    },
  });
}
