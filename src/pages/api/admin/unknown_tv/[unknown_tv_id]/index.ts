/**
 * @file 管理后台/未知电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { unknown_tv_id: id } = req.body as Partial<{ unknown_tv_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少文件夹 id"));
  }
  const user = t_res.data;
  const parsed_tv = await store.prisma.parsed_tv.findMany({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!parsed_tv) {
    return e(Result.Err("没有匹配的文件夹记录"));
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {},
  });
}
