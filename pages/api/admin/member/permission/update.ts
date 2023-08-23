/**
 * @file 更新成员权限
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { member_id, permissions } = req.body as Partial<{ member_id: string; permissions: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!member_id) {
    return e(Result.Err("缺少成员 id"));
  }
  if (!permissions) {
    return e(Result.Err("缺少权限信息"));
  }
  const member_res = await store.find_member({
    id: member_id,
    user_id: user.id,
  });
  if (member_res.error) {
    return e(member_res);
  }
  const member = member_res.data;
  if (!member) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.member.update({
    where: {
      id: member.id,
      user_id_remark: {
        user_id: user.id,
        remark: member.remark,
      },
    },
    data: {
      permission: JSON.stringify(permissions),
    },
  });
  res.status(200).json({ code: 0, msg: "更新成功", data: null });
}
