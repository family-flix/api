/**
 * @file 管理后台/获取解析出的季详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  if (!id) {
    return e("缺少季 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const season = await store.prisma.parsed_season.findFirst({
    where: {
      id,
      user_id,
    },
  });
  if (season === null) {
    return e("没有匹配的季记录");
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: season,
  });
}
