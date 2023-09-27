/**
 * @file 隐藏指定云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, hidden: hidden_str = "1" } = req.query as Partial<{ id: string; hidden: number }>;
  if (!id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  const drive = await store.prisma.drive.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!drive) {
    return Result.Err("没有匹配的记录");
  }
  await store.prisma.drive.update({
    where: {
      id: drive.id,
    },
    data: {},
  });
  res.status(200).json({
    code: 0,
    msg: "隐藏成功",
    data: null,
  });
}
