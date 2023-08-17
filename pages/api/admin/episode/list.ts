/**
 * @file 获取影片列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    tv_id,
    season_id,
    episode_number: episode_text,
    season_number,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    tv_id: string;
    season_id: string;
    episode_number: string;
    season_number: string;
    page: string;
    page_size: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.episode.findMany>[number]>["where"] = {
    user_id: user.id,
  };
  if (tv_id) {
    where.tv_id = tv_id;
  }
  if (season_id) {
    where.season_id = season_id;
  }
  if (episode_text) {
    const e_n = episode_text.match(/[0-9]{1,}/);
    if (e_n) {
      where.episode_text = {
        contains: e_n[0].toString(),
      };
    }
  }
  if (season_number) {
    const s_n = season_number.match(/[0-9]{1,}/);
    if (s_n) {
      where.season_text = {
        contains: s_n[0].toString(),
      };
    }
  }
  const list = await store.prisma.episode.findMany({
    where,
    include: {
      profile: true,
      parsed_episodes: true,
      tv: {
        include: {
          profile: true,
        },
      },
      season: {
        include: {
          profile: true,
        },
      },
    },
    skip: (page - 1) * page_size,
    take: page_size,
    orderBy: {
      episode_number: "asc",
    },
  });
  const count = await store.prisma.episode.count({ where });

  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      total: count,
      no_more: list.length + (page - 1) * page_size >= count,
      list: list.map((episode) => {
        const { id, season_text, episode_text, profile, parsed_episodes, season_id, tv, season } = episode;
        const { name, overview } = profile;
        return {
          id,
          name,
          overview,
          tv: {
            id: tv.id,
            name: tv.profile.name,
          },
          season: {
            id: season.id,
            name: season.profile.name,
            season_number: season.season_number,
          },
          season_number: season_text,
          episode_number: episode_text,
          season_id,
          sources: parsed_episodes.map((parsed_episode) => {
            const { file_id, file_name } = parsed_episode;
            return {
              id: file_id,
              file_id,
              file_name,
            };
          }),
        };
      }),
    },
  });
}
