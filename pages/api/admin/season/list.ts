/**
 * @file 获取 季 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { normalize_partial_tv } from "@/domains/tv/utils";
import { TVProfileWhereInput } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    genres,
    language,
    season_number,
    invalid = "0",
    duplicated = "0",
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    name: string;
    genres: string;
    language: string;
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
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  let queries: TVProfileWhereInput[] = [];
  if (name) {
    queries = queries.concat({
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
      ],
    });
  }
  if (genres) {
    queries = queries.concat({
      OR: genres.split("|").map((g) => {
        return {
          genres: {
            contains: g,
          },
        };
      }),
    });
  }
  if (language) {
    queries = queries.concat({
      OR: language.split("|").map((g) => {
        return {
          origin_country: {
            contains: g,
          },
        };
      }),
    });
  }
  if (Number(duplicated) === 1) {
    const duplicate_tv_profiles = await store.prisma.tv_profile.groupBy({
      by: ["tmdb_id"],
      where: {
        tv: {
          user_id: user.id,
        },
      },
      having: {
        tmdb_id: {
          _count: {
            gt: 1,
          },
        },
      },
    });
    queries = queries.concat({
      tmdb_id: {
        in: duplicate_tv_profiles.map((profile) => {
          const { tmdb_id } = profile;
          return tmdb_id;
        }),
      },
    });
  }
  const where: NonNullable<Parameters<typeof store.prisma.season.findMany>[0]>["where"] = {
    episodes: {
      some: {},
    },
    user_id,
  };
  if (queries.length !== 0) {
    where.tv = {
      profile: {
        AND: queries,
      },
    };
  }
  if (season_number) {
    const sn = season_number.match(/[0-9]{1,}/);
    if (sn) {
      where.season_number = {
        contains: parseInt(sn[0]).toString(),
      };
    }
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
    list: list
      .map((season) => {
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
      })
      .filter((season) => {
        if (Number(invalid)) {
          return season.tips.length !== 0;
        }
        return true;
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
