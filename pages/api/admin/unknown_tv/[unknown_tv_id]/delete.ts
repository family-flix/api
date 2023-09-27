/**
 * @file 管理后台/删除指定电视剧
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
  const { unknown_tv_id: id } = req.query as Partial<{ unknown_tv_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少未识别电视剧 id"));
  }
  const user = t_res.data;
  const tv_res = await store.find_parsed_tv({
    id,
    user_id: user.id,
  });
  if (tv_res.error) {
    return e(tv_res);
  }
  const unknown_tv = tv_res.data;
  if (unknown_tv === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  await store.prisma.parsed_episode.deleteMany({
    where: {
      episode_id: null,
      parsed_tv_id: unknown_tv.id,
      user_id: user.id,
    },
  });
  await store.prisma.parsed_season.deleteMany({
    where: {
      season_id: null,
      parsed_tv_id: unknown_tv.id,
      user_id: user.id,
    },
  });
  await store.prisma.parsed_tv.delete({
    where: {
      id,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
