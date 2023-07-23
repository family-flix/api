/**
 * @file 清除重复的剧集详情
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

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const duplicate_episode_profiles = await store.prisma.episode_profile.groupBy({
    by: ["tmdb_id"],
    having: {
      tmdb_id: {
        _count: {
          gt: 1,
        },
      },
    },
  });
  for (const profile of duplicate_episode_profiles) {
    const { tmdb_id } = profile;
    // const r = await store.prisma.episode_profile.findMany({
    //   where: {
    //     tmdb_id,
    //     episode: null,
    //   },
    // });
    await store.prisma.episode_profile.deleteMany({
      where: {
        tmdb_id,
        episode: null,
      },
    });
  }
  res.status(200).json({ code: 0, msg: "清除成功", data: null });
}
