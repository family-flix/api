/**
 * @file 获取重复的剧集
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    page: page_str,
    page_size: page_size_str,
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  const duplicate_episode_profiles = await store.prisma.episode_profile.groupBy({
    by: ["unique_id"],
    where: {
      episodes: {
        every: {
          user_id: user.id,
        },
      },
    },
    having: {
      unique_id: {
        _count: {
          gt: 1,
        },
      },
    },
  });
  const where: ModelQuery<"episode"> = {
    profile: {
      unique_id: {
        in: duplicate_episode_profiles
          .map((profile) => {
            const { unique_id } = profile;
            return unique_id;
          })
          .filter(Boolean) as string[],
      },
    },
    user_id: user.id,
  };
  const count = await store.prisma.episode.count({ where });
  const list = await store.prisma.episode.findMany({
    where,
    include: {
      profile: true,
      tv: {
        include: {
          profile: true,
        },
      },
      parsed_episodes: true,
    },
    take: page_size,
    skip: (page - 1) * page_size,
    orderBy: {
      profile: {
        unique_id: "asc",
      },
    },
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      total: count,
      no_more: (page - 1) * page_size + list.length >= count,
      list: list.map((episode) => {
        const { id, episode_text, season_text, profile, tv, parsed_episodes } = episode;
        return {
          id,
          name: profile.name,
          episode_number: episode_text,
          season_number: season_text,
          tmdb_id: profile.unique_id,
          tv: {
            name: tv.profile.name,
          },
          sources: parsed_episodes.map((source) => {
            const { file_id, file_name, parent_paths } = source;
            return {
              file_id,
              file_name,
              parent_paths,
            };
          }),
        };
      }),
    },
  });
}
