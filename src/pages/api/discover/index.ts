/**
 * @file 获取推荐
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const r = await store.prisma.collection.findMany({
    where: {
      user_id: member.user.id,
    },
    include: {
      seasons: {
        include: {
          tv: {
            include: {
              profile: true,
            },
          },
          profile: true,
          episodes: {
            include: {
              _count: true,
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
    take: 10,
    orderBy: [
      {
        sort: "desc",
      },
      {
        created: "desc",
      },
    ],
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: r.map((collection) => {
      const { id, title, desc, styles, sort, seasons, movies } = collection;
      const season_list = seasons.map((season) => {
        const { id, profile, tv, episodes } = season;
        return {
          id,
          tv_id: tv.id,
          name: tv.profile.name,
          poster_path: profile.poster_path || tv.profile.poster_path,
          text: `更新到 ${episodes.length} 集`,
          type: 1,
        };
      });
      const movie_list = movies.map((season) => {
        const { id, profile } = season;
        return {
          id,
          name: profile.name,
          poster_path: profile.poster_path,
          text: "",
          type: 2,
        };
      });
      return {
        id,
        title,
        desc,
        styles,
        sort,
        medias: movie_list.concat(season_list),
      };
    }),
  });
}
