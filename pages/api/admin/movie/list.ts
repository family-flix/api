/**
 * @file 获取电影列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { store } from "@/store";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { MovieProfileWhereInput } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    duplicated = "0",
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    name: string;
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
  let queries: MovieProfileWhereInput[] = [];
  const where: NonNullable<Parameters<typeof store.prisma.movie.findMany>[0]>["where"] = {
    parsed_movies: {
      some: {},
    },
    user_id,
  };
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
  if (Number(duplicated) === 1) {
    const duplicate_movie_profiles = await store.prisma.movie_profile.groupBy({
      by: ["tmdb_id"],
      where: {
        movie: {
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
        in: duplicate_movie_profiles.map((profile) => {
          const { tmdb_id } = profile;
          return tmdb_id;
        }),
      },
    });
  }
  if (queries.length !== 0) {
    where.profile = {
      AND: queries,
    };
  }
  const count = await store.prisma.movie.count({
    where,
  });
  const list = await store.prisma.movie.findMany({
    where,
    include: {
      profile: true,
      parsed_movies: true,
    },
    orderBy: {
      profile: { air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    no_more: list.length + (page - 1) * page_size >= count,
    page,
    page_size,
    list: list.map((movie) => {
      const { id, profile } = movie;
      const {
        name,
        original_name,
        overview,
        vote_average,
        runtime,
        air_date,
        poster_path,
        popularity,
        genres,
        origin_country,
      } = profile;
      return {
        id,
        name,
        original_name,
        overview,
        air_date: air_date ?? "unknown",
        poster_path,
        popularity,
        vote_average,
        genres,
        origin_country,
        runtime,
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
