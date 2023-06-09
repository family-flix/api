/**
 * @file 获取 tv 详情，包括季、集等信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
    },
    include: {
      profile: true,
      episodes: {
        include: {
          profile: true,
          parsed_episodes: true,
        },
        orderBy: {
          episode_number: "asc",
        },
        skip: 0,
        take: 20,
      },
      seasons: {
        include: {
          profile: true,
          parsed_season: true,
        },
        orderBy: {
          season_number: "asc",
        },
      },
    },
  });
  if (tv === null) {
    return e("没有匹配的电视剧记录");
  }
  const { profile, seasons, episodes } = tv;
  const { name, original_name, overview, poster_path, popularity } = profile;
  const data = {
    id,
    name: name || original_name,
    overview,
    poster_path,
    popularity,
    episodes: episodes.map((episode) => {
      const { id, season_number, episode_number, profile } = episode;
      const { name, overview } = profile;
      return {
        id,
        name,
        overview,
        season_number,
        episode_number,
      };
    }),
  };
  res.status(200).json({ code: 0, msg: "", data });
}
