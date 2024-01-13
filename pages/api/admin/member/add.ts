/**
 * @file 新增成员
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
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
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!remark) {
    return e(Result.Err("缺少成员备注"));
  }
  const existing_member = await store.prisma.member.findUnique({
    where: {
      user_id_inviter_id_remark: {
        remark,
        inviter_id: "",
        user_id: user.id,
      },
    },
  });
  if (existing_member) {
    return e(Result.Err("已存在相同备注的成员了"));
  }
  const r = await store.add_member({
    remark,
    name: name || null,
    email: email || null,
    disabled: 0,
    user_id: user.id,
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
