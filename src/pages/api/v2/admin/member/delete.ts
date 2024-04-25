/**
 * @file 删除成员
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_member_delete(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  if (!id) {
    return e("缺少成员 id");
  }
  const member = await store.prisma.member.findFirst({
    where: {
      id,
      user_id,
    },
  });
  if (!member) {
    return e("没有匹配的成员");
  }
  const r = await store.prisma.member.update({
    where: {
      id: member.id,
    },
    data: {
      delete: 1,
    },
  });
  return res.status(200).json({ code: 0, msg: "删除成员成功", data: null });
}
