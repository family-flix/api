/**
 * @file 管理后台/电视剧详情
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
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
      user_id,
    },
    include: {
      _count: true,
      profile: true,
      seasons: {
        include: {
          profile: true,
          parsed_season: true,
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

  const data = (() => {
    const { id, profile, seasons, _count } = tv;
    const {
      name,
      original_name,
      overview,
      poster_path,
      backdrop_path,
      original_language,
      first_air_date,
      episode_count,
      season_count,
    } = profile;
    const incomplete = episode_count !== 0 && episode_count !== _count.episodes;
    return {
      id,
      name: name || original_name,
      overview,
      poster_path,
      backdrop_path,
      original_language,
      first_air_date,
      incomplete,
      seasons: seasons.map((season) => {
        const { id, season_number, profile, episodes } = season;
        const { name, overview } = profile;
        return {
          id,
          name: name || season_number,
          overview,
          episodes: episodes.map((episode) => {
            const { id, profile, episode_number } = episode;
            const { name, overview } = profile;
            return {
              id,
              name: name || episode_number,
              overview,
            };
          }),
        };
      }),
    };
  })();

  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
