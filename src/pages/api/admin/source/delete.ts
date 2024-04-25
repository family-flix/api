/**
 * @file 管理后台/删除指定视频源（不删除文件）
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
  const { drive_id, season_id, movie_id } = req.body as Partial<{
    drive_id: string;
    season_id: string;
    movie_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!season_id && !movie_id) {
    return e(Result.Err("不能删除云盘内全部解析结果"));
  }
  const user = t_res.data;
  if (season_id) {
    await store.prisma.parsed_episode.deleteMany({
      where: {
        season_id,
        drive_id,
        user_id: user.id,
      },
    });
  }
  if (movie_id) {
    await store.prisma.parsed_movie.deleteMany({
      where: {
        movie_id,
        drive_id,
        user_id: user.id,
      },
    });
  }
  res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
