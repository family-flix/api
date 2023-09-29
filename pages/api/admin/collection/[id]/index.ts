/**
 * @file 管理后台/获取集合详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { MediaTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少集合 id"));
  }
  const user = t_res.data;
  const collection = await store.prisma.collection.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      seasons: {
        include: {
          profile: true,
          tv: {
            include: {
              profile: true,
            },
          },
        },
      },
      movies: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (!collection) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { sort, title, desc, seasons, movies } = collection;
  const data = {
    id,
    title,
    desc,
    sort,
    medias: [
      ...seasons.map((season) => {
        const {
          id,
          tv: { profile },
        } = season;
        return {
          id,
          type: MediaTypes.Season,
          name: profile.name,
          poster_path: season.profile.poster_path || profile.poster_path,
        };
      }),
      ...movies.map((movie) => {
        const { id, profile } = movie;
        return {
          id,
          type: MediaTypes.Movie,
          name: profile.name,
          poster_path: profile.poster_path,
        };
      }),
    ],
  };
  res.status(200).json({ code: 0, msg: "", data });
}
