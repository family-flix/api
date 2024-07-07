/**
 * @file 创建一条权限
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { add_zeros, r_id } from "@/utils/index";

export default async function v0_admin_permission_add(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { desc } = req.body as Partial<{ desc: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!desc) {
    return e(Result.Err("缺少权限描述"));
  }
  const existing_res = await store.prisma.permission.findFirst({
    where: {
      desc,
      user_id: user.id,
    },
  });
  if (existing_res) {
    return e(Result.Err("已存在同名权限"));
  }
  const first_permission = await store.prisma.permission.findFirst({
    where: {
      user_id: user.id,
    },
    orderBy: {
      created: "desc",
    },
  });
  let code = 1;
  if (first_permission) {
    code = parseInt(first_permission.code) + 1;
  }
  await store.prisma.permission.create({
    data: {
      id: r_id(),
      desc,
      code: add_zeros(code, 3),
      user_id: user.id,
    },
  });
  return res.status(200).json({ code: 0, msg: "", data: null });
}
