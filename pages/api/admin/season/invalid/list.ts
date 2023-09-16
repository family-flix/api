/**
 * @file 获取有问题的季列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { normalize_partial_tv } from "@/domains/tv/utils";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { season_to_chinese_num } from "@/utils";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    drive_id,
    season_number,
    page: page_str,
    page_size: page_size_str,
  } = req.query as Partial<{
    name: string;
    genres: string;
    language: string;
    drive_id: string;
    season_number: string;
    invalid: string;
    duplicated: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id } = user;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  const where: ModelQuery<"season"> = {
    OR: [
      {
        episodes: {
          none: {},
        },
      },
      {
        episodes: {
          every: {
            parsed_episodes: {
              none: {},
            },
          },
        },
      },
    ],
    user_id,
  };
  const count = await store.prisma.season.count({
    where,
  });
  const list = await store.prisma.season.findMany({
    where,
    include: {
      _count: true,
      profile: true,
      sync_tasks: true,
      tv: {
        include: {
          _count: true,
          profile: true,
          parsed_tvs: true,
        },
      },
      episodes: {
        include: {
          profile: true,
          _count: true,
          parsed_episodes: {
            select: {
              file_id: true,
              file_name: true,
              size: true,
            },
          },
        },
        orderBy: {
          episode_number: "desc",
        },
      },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    list: list.map((season) => {
      const { id, season_text, profile, tv, sync_tasks } = season;
      const { air_date } = profile;
      const { name, original_name, overview, poster_path, popularity } = normalize_partial_tv({
        ...tv,
        sync_tasks,
      });
      return {
        id,
        tv_id: tv.id,
        name,
        original_name,
        overview,
        season_number: season_text,
        season_text: season_to_chinese_num(season_text),
        poster_path: profile.poster_path || poster_path,
        first_air_date: air_date,
        popularity,
      };
    }),
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
