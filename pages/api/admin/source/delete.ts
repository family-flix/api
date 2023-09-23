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
  const { drive_id } = req.query as Partial<{ drive_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const user = t_res.data;
  await store.prisma.parsed_episode.deleteMany({
    where: {
      drive_id,
      user_id: user.id,
    },
  });
  await store.prisma.parsed_movie.deleteMany({
    where: {
      drive_id,
      user_id: user.id,
    },
  });
  res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
