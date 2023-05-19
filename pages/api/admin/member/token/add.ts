/**
 * @file 新增成员授权token
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

const { add_member_link, find_member } = store;

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{
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
  const member_r = await find_member({ id, user_id });
  if (member_r.error) {
    return e(member_r);
  }
  if (!member_r.data) {
    return e("没有匹配的成员记录");
  }
  const token_res = await User.Token({ id });
  if (token_res.error) {
    return e(token_res);
  }
  const token = token_res.data;
  const link = `/?token=${token}`;
  const r = await add_member_link({
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
      link,
    },
  });
}
