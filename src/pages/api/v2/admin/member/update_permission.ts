/**
 * @file 更新成员权限
 */
import dayjs from "dayjs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_member_update_permission(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
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
  const member = await store.prisma.member.findFirst({
    where: {
      id: member_id,
      user_id: user.id,
    },
  });
  if (!member) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.member.update({
    where: {
      id: member.id,
    },
    data: {
      updated: dayjs().toISOString(),
      permission: JSON.stringify(permissions),
    },
  });
  return res.status(200).json({ code: 0, msg: "更新成功", data: null });
}
