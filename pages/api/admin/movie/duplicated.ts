/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { normalize_partial_tv } from "@/domains/tv/utils";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
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
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const duplicate_tv_profiles = await store.prisma.movie_profile.groupBy({
    by: ["tmdb_id"],
    where: {
      movie: {
        parsed_movies: {
          some: {},
        },
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
  const where: ModelQuery<typeof store.prisma.movie.findMany>["where"] = {
    profile: {
      tmdb_id: {
        in: duplicate_tv_profiles.map((profile) => {
          const { tmdb_id } = profile;
          return tmdb_id;
        }),
      },
    },
    user_id: user.id,
  };
  const count = await store.prisma.movie.count({ where });
  const list = await store.prisma.movie.findMany({
    where,
    include: {
      _count: true,
      profile: true,
      parsed_movies: true,
    },
    take: page_size,
    skip: (page - 1) * page_size,
    orderBy: {
      profile: {
        tmdb_id: "asc",
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
      list: list.map((movie) => {
        const { id, profile } = movie;
        const { name, original_name, overview, air_date, poster_path, popularity } = profile;
        return {
          id,
          name,
          original_name,
          overview,
          air_date: air_date ?? "unknown",
          poster_path,
          popularity,
        };
      }),
    },
  });
}
