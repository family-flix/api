/**
 * @file 成员邀请好友
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { remark } = req.body as Partial<{ remark: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!remark) {
    return e(Result.Err("缺少备注"));
  }
  const member = t_res.data;
  const existing_res = await store.find_member({
    remark,
    inviter_id: member.id,
  });
  if (existing_res.error) {
    return e(existing_res);
  }
  if (existing_res.data) {
    return e(Result.Err("已经邀请了同名成员了"));
  }
  const r = await store.add_member({
    remark,
    name: null,
    email: null,
    disabled: 0,
    inviter_id: member.id,
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
  const created_member = {
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
  res.status(200).json({ code: 0, msg: "新增成功", data: created_member });
}
