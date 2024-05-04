/**
 * @file 获取现在是否已经有管理员
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";

export default async function v0_admin_user_existing(req: NextApiRequest, res: NextApiResponse<any>) {
  const user = await store.prisma.user.findFirst({});
  return res.status(200).json({
    code: 0,
    msg: "获取成功",
    data: {
      existing: user !== null,
    },
  });
}
