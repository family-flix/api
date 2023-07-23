/**
 * @file 获取 季 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, resultify } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { normalize_partial_tv } from "@/domains/tv/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.season.findMany>[0]>["where"] = {
    episodes: {
      some: {},
    },
    user_id,
  };
  if (name) {
    where.tv = {
      profile: {
        OR: [
          {
            name: {
              contains: name,
            },
          },
          {
            original_name: {
              contains: name,
            },
          },
          {
            overview: {
              contains: name,
            },
          },
        ],
      },
    };
  }
  const count = await store.prisma.season.count({
    where,
  });
  const list = await store.prisma.season.findMany({
    where,
    include: {
      _count: true,
      profile: true,
      tv: {
        include: {
          _count: true,
          profile: true,
          parsed_tvs: {
            include: {
              binds: true,
            },
          },
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
    orderBy: {
      profile: { air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    list: list.map((season) => {
      const { id, season_number, profile, tv, _count } = season;
      const { air_date, episode_count } = profile;
      const incomplete = episode_count !== 0 && episode_count !== _count.episodes;
      const { name, original_name, overview, poster_path, popularity, need_bind, sync_task, valid_bind, binds } =
        normalize_partial_tv(tv);
      const tips: string[] = [];
      if (binds.length !== 0 && valid_bind === null && tv.profile.in_production) {
        tips.push("更新已失效");
      }
      if (tv.profile.in_production && incomplete && binds.length === 0) {
        tips.push("未完结但缺少同步任务");
      }
      if (!tv.profile.in_production && incomplete) {
        tips.push(`已完结但集数不完整，总集数 ${episode_count}，当前集数 ${_count.episodes}`);
      }
      return {
        id,
        tv_id: tv.id,
        name,
        original_name,
        overview,
        season_number,
        poster_path: profile.poster_path || poster_path,
        first_air_date: air_date,
        popularity,
        cur_episode_count: _count.episodes,
        episode_count,
        incomplete,
        need_bind,
        sync_task,
        tips,
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
