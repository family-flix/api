/**
 * @file 管理后台/获取解析出的剧集详情
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
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e("缺少剧集 id");
  }
  const user = t_res.data;
  const episode = await store.prisma.parsed_episode.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      parsed_tv: true,
    },
  });
  if (episode === null) {
    return e(Result.Err("没有匹配的剧集记录"));
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: episode,
  });
}
