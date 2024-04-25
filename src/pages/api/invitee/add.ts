/**
 * @file 成员邀请好友
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { User } from "@/domains/user";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v0_wechat_invitee_add(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
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
  const existing = await store.prisma.member.findFirst({
    where: {
      remark,
      inviter_id: member.id,
      user_id: member.user.id,
    },
    include: {
      tokens: true,
    },
  });
  if (existing) {
    const token = existing.tokens[0];
    return e(
      Result.Err("已经邀请过同名成员了", 10000, {
        id: existing.id,
        token: token
          ? [
              {
                id: token.id,
                token: token.token,
              },
            ]
          : null,
      })
    );
  }
  const r = await store.add_member({
    remark,
    name: null,
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
  return res.status(200).json({ code: 0, msg: "新增成功", data: created_member });
}
