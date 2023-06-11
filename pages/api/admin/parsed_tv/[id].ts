/**
 * @file 管理后台/获取解析出的剧集详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id || id === "undefined") {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const episode = await store.prisma.parsed_tv.findFirst({
    where: {
      id,
      user_id,
    },
  });
  if (episode === null) {
    return e("没有匹配的电视剧记录");
  }

  res.status(200).json({
    code: 0,
    msg: "",
    data: episode,
  });
}
