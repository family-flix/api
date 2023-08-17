/**
 * @file 电视剧、影片聚合搜索
 * @deprecated
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

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
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const season_where: NonNullable<Parameters<typeof store.prisma.season.findMany>[0]>["where"] = {
    episodes: {
      some: {},
    },
    user_id: member.user.id,
  };
  const movie_where: NonNullable<Parameters<typeof store.prisma.movie.findMany>[0]>["where"] = {
    parsed_movies: {
      some: {},
    },
    user_id: member.user.id,
  };
  if (name) {
    season_where.tv = {
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
    movie_where.profile = {
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
    };
  }
  const tv_count = await store.prisma.season.count({
    where: season_where,
  });
  const tv_list = await store.prisma.season.findMany({
    where: season_where,
    include: {
      profile: true,
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
  const movie_count = await store.prisma.movie.count({
    where: movie_where,
  });
  const movie_list = await store.prisma.movie.findMany({
    where: movie_where,
    include: {
      profile: true,
    },
    orderBy: {
      profile: { air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  // console.log('movie', movie_list)
  const tv_no_more = tv_list.length + (page - 1) * page_size >= tv_count;
  const movie_no_more = movie_list.length + (page - 1) * page_size >= movie_count;
  type SearchResult = {
    id: string;
    type: number;
    season_number?: string;
    name: string;
    overview: string;
    poster_path: string;
    air_date: string;
    popularity: number;
  };
  const data = {
    total: tv_count + movie_count,
    list: tv_list
      .map((season) => {
        const { id, tv_id, season_text, profile, tv } = season;
        const { air_date } = profile;
        const { name, original_name, overview, poster_path, popularity } = tv.profile;
        const r = {
          id,
          tv_id,
          type: 1,
          season_number: season_text,
          name: name || original_name,
          overview,
          poster_path: profile.poster_path || poster_path,
          air_date,
          popularity,
        } as SearchResult;
        return r;
      })
      .concat(
        movie_list.map((movie) => {
          const { id, profile } = movie;
          const { air_date } = profile;
          const { name, original_name, overview, poster_path, popularity } = profile;
          const r = {
            id,
            type: 2,
            season_number: undefined,
            name: name || original_name,
            overview,
            poster_path: profile.poster_path || poster_path,
            air_date,
            popularity,
          } as SearchResult;
          return r;
        })
      ),
    page,
    page_size,
    no_more: tv_no_more && movie_no_more,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
