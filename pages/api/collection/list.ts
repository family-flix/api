/**
 * @file 获取影视剧推荐集合列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { ModelQuery } from "@/domains/store/types";
import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { MediaTypes } from "@/constants";
import { store } from "@/store";
import { response_error_factory } from "@/utils/server";
import { to_number } from "@/utils/primitive";

type MediaPayload = {
  id: string;
  type: number;
  tv_id?: string;
  season_text?: string;
  name: string;
  poster_path: string;
  air_date: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { page: page_str, page_size: page_size_str } = req.query as Partial<{
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  let queries: NonNullable<ModelQuery<"collection">>[] = [];
  const where: ModelQuery<"collection"> = {
    user_id: member.user.id,
  };
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.collection.count({
    where,
  });
  const list = await store.prisma.collection.findMany({
    where,
    include: {
      seasons: {
        include: {
          _count: true,
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
    orderBy: [
      {
        sort: "desc",
      },
      {
        created: "desc",
      },
    ],
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
    list: list.map((collection) => {
      const { id, title, desc, seasons, movies } = collection;
      return {
        id,
        title,
        desc,
        medias: seasons
          .map((season) => {
            const { id, tv, season_text } = season;
            const { name, poster_path } = tv.profile;
            return {
              id,
              type: MediaTypes.Season,
              name,
              poster_path: season.profile.poster_path || poster_path,
              tv_id: tv.id,
              air_date: season.profile.air_date,
              cur_episode_count: season._count.episodes,
              episode_count: season.profile.episode_count,
              season_text,
            } as MediaPayload;
          })
          .concat(
            movies.map((movie) => {
              const { id, profile } = movie;
              const { name, poster_path, air_date } = profile;
              return {
                id,
                type: MediaTypes.Movie,
                name,
                poster_path,
                air_date,
              } as MediaPayload;
            })
          ),
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
