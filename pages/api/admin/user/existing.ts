/**
 * @file 获取现在是否已经有管理员
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const user = await store.prisma.user.findFirst({});
  res.status(200).json({
    code: 0,
    msg: "获取成功",
    data: {
      existing: user !== null,
    },
  });
}
