/**
 * @file 删除指定视频源（不删除文件）
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
  const { id: source_id } = req.body as Partial<{ id: string }>;
  if (!source_id) {
    return e(Result.Err("缺少影片 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const episode_source = await store.prisma.parsed_episode.findFirst({
    where: {
      id: source_id,
      user_id: user.id,
    },
  });
  if (episode_source) {
    await store.prisma.parsed_episode.delete({
      where: {
        id: episode_source.id,
      },
    });
    res.status(200).json({ code: 0, msg: "删除成功", data: null });
    return;
  }
  const movie_source = await store.prisma.parsed_movie.findFirst({
    where: {
      id: source_id,
      user_id: user.id,
    },
  });
  if (movie_source) {
    await store.prisma.parsed_movie.delete({
      where: {
        id: movie_source.id,
      },
    });
    res.status(200).json({ code: 0, msg: "删除成功", data: null });
  }
  return e(Result.Err("没有匹配的影片记录"));
}
