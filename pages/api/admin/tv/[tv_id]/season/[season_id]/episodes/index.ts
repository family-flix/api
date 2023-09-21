/**
 * @file 指定电视剧、指定季下的所有集
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { User } from "@/domains/user";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    tv_id,
    season_id,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    tv_id: string;
    season_id: string;
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  if (!tv_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  if (!season_id) {
    return e(Result.Err("缺少季 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.episode.findMany>[0]>["where"] = {
    tv_id,
    season_id,
    user_id,
  };
  const count = await store.prisma.episode.count({
    where,
  });
  const list = await store.prisma.episode.findMany({
    where,
    include: {
      profile: true,
      parsed_episodes: {
        include: {
          drive: true,
        },
      },
    },
    orderBy: {
      episode_number: "asc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    no_more: list.length + (page - 1) * page_size >= count,
    page,
    page_size,
    list: list.map((episode) => {
      const { id, episode_text, profile, parsed_episodes } = episode;
      return {
        id,
        name: profile.name,
        overview: profile.overview,
        first_air_date: profile.air_date,
        runtime: profile.runtime,
        episode_number: episode_text,
        sources: parsed_episodes.map((parsed_episode) => {
          const { id, file_id, file_name, parent_paths, size, drive } = parsed_episode;
          return {
            id,
            file_id,
            file_name,
            parent_paths,
            size,
            drive: {
              id: drive.id,
              name: drive.name,
              avatar: drive.avatar,
            },
          };
        }),
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
