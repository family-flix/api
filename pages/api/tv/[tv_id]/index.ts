/**
 * @file 获取 tv 详情，包括季、集等信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  const member = t_res.data;
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
      user_id: member.user.id,
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
        },
        orderBy: {
          season_number: "asc",
        },
      },
    },
  });
  if (tv === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
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
      const { id, season_text, episode_text, profile } = episode;
      const { name, overview, runtime } = profile;
      return {
        id,
        name,
        overview,
        season_number: season_text,
        episode_number: episode_text,
        runtime,
      };
    }),
  };
  res.status(200).json({ code: 0, msg: "", data });
}
