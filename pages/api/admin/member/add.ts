/**
 * @file 新增成员
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
  const { remark, name, email } = req.body as Partial<{
    name: string;
    email: string;
    remark: string;
  }>;
  if (!remark) {
    return e("缺少成员备注");
  }
  const t_resp = await User.New(authorization, store);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const existing_res = await store.find_member({ remark, user_id });
  if (existing_res.error) {
    return e(existing_res);
  }
  const existing_member = existing_res.data;
  if (existing_member) {
    return e("已存在相同备注的成员了");
  }
  const r = await store.add_member({
    remark,
    name: name ?? null,
    email: email ?? null,
    disabled: 0,
    user_id,
  });
  if (r.error) {
    return e(r);
  }
  const token_res = await User.Token({ id: r.data.id });
  if (token_res.error) {
    return e(token_res);
  }
  const token = token_res.data;
  const r2 = await store.add_member_link({
    member_id: r.data.id,
    token,
    used: 0,
  });
  if (r2.error) {
    return e(r2);
  }
  const member = {
    id: r.data.id,
    remark: r.data.remark,
    tokens: [
      {
        id: r2.data.id,
        token: r2.data.token,
        used: r2.data.used,
      },
    ],
  };
  res.status(200).json({ code: 0, msg: "添加成员成功", data: member });
}
