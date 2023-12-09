/**
 * @file 获取 季 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { TVProfileWhereInput } from "@/domains/store/types";
import { MediaProfileSourceTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    genres,
    language,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    name: string;
    genres: string;
    language: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
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
        // {
        //   overview: {
        //     contains: name,
        //   },
        // },
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
  const where: NonNullable<Parameters<typeof store.prisma.season.findMany>[0]>["where"] = {
    profile: {
      source: {
        not: MediaProfileSourceTypes.Other,
      },
    },
    episodes: {
      some: {
        parsed_episodes: {
          some: {},
        },
      },
    },
    user_id: member.user.id,
  };
  if (queries.length !== 0) {
    where.tv = {
      profile: {
        AND: queries,
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
      profile: {
        include: {
          persons: {
            take: 5,
            include: {
              profile: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      tv: {
        include: {
          profile: true,
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
      const { id, season_text, profile, tv, _count } = season;
      const { name, poster_path, genres, origin_country } = tv.profile;
      return {
        id,
        tv_id: tv.id,
        name,
        season_text,
        episode_count: profile.episode_count,
        cur_episode_count: _count.episodes,
        poster_path: profile.poster_path || poster_path,
        air_date: profile.air_date,
        genres,
        origin_country,
        vote_average: profile.vote_average,
        actors: profile.persons.map((p) => {
          const { profile } = p;
          return {
            id: profile.id,
            name: profile.name,
            avatar: profile.profile_path,
          };
        }),
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
