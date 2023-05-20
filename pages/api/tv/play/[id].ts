/**
 * @file 获取 tv 详情，包括季、集等信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Member } from "@/domains/user/member";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await Member.New(authorization);
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
      play_history: true,
      episodes: {
        include: {
          profile: true,
          parsed_episodes: true,
        },
        orderBy: {
          episode_number: "asc",
        },
        skip: 0,
        take: 1,
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
  const { profile, play_history, seasons, episodes } = tv;
  const playing_episode = await (async () => {
    if (play_history === null) {
      return null;
    }
    const { episode_id } = play_history;
    if (episode_id === null) {
      return null;
    }
  })();
  const first_episode = (() => {
    if (episodes.length === 0) {
      return null;
    }
    const { id, season_number, episode_number, profile, parsed_episodes } = episodes[0];
    const { name, overview } = profile;
    return {
      id,
      name,
      overview,
      season_number,
      episode_number,
      sources: parsed_episodes.map((parsed_episode) => {
        const { file_id, file_name } = parsed_episode;
        return {
          id: file_id,
          file_id,
          file_name,
        };
      }),
    };
  })();

  const { name, original_name, overview, poster_path, popularity } = profile;
  const data = {
    id,
    name: name || original_name,
    overview,
    poster_path,
    popularity,
    seasons: seasons.map((season) => {
      const { id, season_number, profile } = season;
      const { name, overview } = profile;
      return {
        id,
        name: name || season_number,
        overview,
      };
    }),
    first_episode,
  };
  res.status(200).json({ code: 0, msg: "", data });
}
