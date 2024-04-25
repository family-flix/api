/**
 * @file 删除指定剧集
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { episode_id } = req.body as Partial<{ episode_id: string }>;
  if (!episode_id) {
    return e(Result.Err("缺少剧集 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const episode = await store.prisma.episode.findFirst({
    where: {
      id: episode_id,
      user_id: user.id,
    },
  });
  if (!episode) {
    return e(Result.Err("没有匹配的剧集"));
  }
  await store.prisma.episode.delete({
    where: {
      id: episode.id,
    },
  });
  res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
