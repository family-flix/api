/**
 * @file 成员邀请好友
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { User } from "@/domains/user";
import { r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { id } = req.body as Partial<{ id: string }>;
  const { remark } = req.body as Partial<{ remark: string }>;
  if (!id) {
    return e(Result.Err("缺少邀请人信息"));
  }
  const t_res = await Member.Get({ id }, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const existing = await store.prisma.member.findFirst({
    where: {
      OR: [
        {
          remark,
        },
        {
          name: remark,
        },
      ],
      inviter_id: member.id,
    },
  });
  if (existing) {
    return e(Result.Err("已存在同名用户"));
  }
  const r = await store.add_member({
    remark: remark || r_id(),
    name: remark,
    email: null,
    disabled: 0,
    inviter_id: member.id,
    user_id: member.user.id,
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
  res.status(200).json({ code: 0, msg: "注册成功", data: created_member });
}
