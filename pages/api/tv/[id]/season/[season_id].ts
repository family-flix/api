/**
 * @file 获取指定电视剧、指定季详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { Member } from "@/domains/user/member";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, season_id } = req.query as Partial<{ id: string; season_id: string }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  if (!season_id) {
    return e("缺少季 id");
  }
  const t_res = await Member.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id } = t_res.data;

  const season = await store.prisma.season.findFirst({
    where: {
      id: season_id,
      tv_id: id,
    },
    include: {
      profile: true,
      episodes: {
        include: {
          profile: true,
        },
        orderBy: {
          episode_number: "asc",
        },
      },
    },
  });

  if (season === null) {
    return e("没有匹配的季记录");
  }
  const { season_number, profile, episodes } = season;
  const { name, overview, poster_path } = profile;
  const data = {
    id,
    name,
    overview,
    poster_path,
    season_number: name || season_number,
    episodes: episodes.map((episode) => {
      const { id, profile, episode_number } = episode;
      const { name, overview } = profile;
      return {
        id,
        name: name || episode_number,
        overview,
        episode_number,
      };
    }),
  };

  res.status(200).json({ code: 0, msg: "", data });
}
