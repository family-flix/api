/**
 * @file 删除成员
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { User } from "@/domains/user";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;

  if (!id) {
    return e("缺少成员 id");
  }

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;

  const member_res = await store.find_member({ id, user_id });
  if (member_res.error) {
    return e(member_res);
  }
  const member = member_res.data;
  if (!member) {
    return e("没有匹配的成员");
  }

  const r = await store.update_member(id, {
    delete: 1,
  });

  if (r.error) {
    return e(r);
  }

  res.status(200).json({ code: 0, msg: "删除成员成功", data: null });
}
