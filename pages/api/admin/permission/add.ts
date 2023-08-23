/**
 * @file 创建一条权限
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
  res.status(200).json({ code: 0, msg: "", data: null });
}
