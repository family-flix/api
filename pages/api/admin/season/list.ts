/**
 * @file 获取 季 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { normalize_partial_tv } from "@/domains/media_thumbnail/utils";
import { ModelQuery, TVProfileWhereInput } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { season_to_chinese_num } from "@/utils";
import { response_error_factory } from "@/utils/server";
import { to_number } from "@/utils/primitive";
import { store } from "@/store";
import { MediaProfileSourceTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    genres,
    language,
    drive_id,
    drive_ids,
    season_number,
    invalid = "0",
    duplicated = "0",
    in_production,
    page: page_str,
    page_size: page_size_str,
  } = req.query as Partial<{
    name: string;
    genres: string;
    language: string;
    /** @deprecated */
    drive_id: string;
    drive_ids: string;
    in_production: string;
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
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
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
  if (in_production) {
    queries = queries.concat({
      in_production: to_number(in_production, 0),
    });
  }
  if (Number(duplicated) === 1) {
    const duplicate_tv_profiles = await store.prisma.season_profile.groupBy({
      by: ["unique_id"],
      where: {
        seasons: {
          every: {
            tv: {
              user_id: user.id,
            },
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
    queries = queries.concat({
      unique_id: {
        in: duplicate_tv_profiles
          .map((profile) => {
            const { unique_id } = profile;
            return unique_id;
          })
          .filter(Boolean) as string[],
      },
    });
  }
  const where: ModelQuery<"season"> = {
    profile: {
      source: {
        // 不是「其他」季
        not: MediaProfileSourceTypes.Other,
      },
    },
    AND: [
      {
        episodes: {
          some: {},
        },
      },
      {
        parsed_episodes: {
          some: {},
        },
      },
    ],
    user_id: user.id,
  };
  if (queries.length !== 0) {
    where.tv = {
      profile: {
        AND: queries,
      },
    };
  }
  if (drive_ids) {
    where.parsed_seasons = {
      every: {
        drive_id: {
          in: drive_ids.split("|"),
        },
      },
    };
  }
  if (drive_id) {
    where.tv = where.tv || {};
    where.tv.parsed_tvs = {
      every: {
        drive_id,
      },
    };
  }
  if (season_number) {
    const sn = season_number.match(/[0-9]{1,}/);
    if (sn) {
      where.season_text = {
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
      sync_tasks: true,
      tv: {
        include: {
          _count: true,
          profile: true,
        },
      },
      episodes: {
        include: {
          profile: true,
          _count: true,
        },
        orderBy: {
          episode_number: "desc",
        },
      },
      parsed_episodes: true,
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
        const { id, season_text, profile, tv, sync_tasks, _count } = season;
        const { air_date, episode_count } = profile;
        const incomplete = episode_count !== 0 && episode_count !== _count.episodes;
        const { name, original_name, overview, poster_path, popularity, need_bind, sync_task, valid_bind, binds } =
          normalize_partial_tv({
            ...tv,
            sync_tasks,
          });
        const tips: string[] = [];
        if (binds.length !== 0 && valid_bind === null && tv.profile.in_production) {
          tips.push("更新任务已失效");
        }
        if (tv.profile.in_production && incomplete && binds.length === 0) {
          tips.push("未完结但缺少更新任务");
        }
        if (!tv.profile.in_production && incomplete) {
          tips.push(`已完结但集数不完整，总集数 ${episode_count}，当前集数 ${_count.episodes}`);
        }
        return {
          id,
          tv_id: tv.id,
          name: name || original_name,
          original_name,
          overview,
          season_number: season_text,
          season_text: season_to_chinese_num(season_text),
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
