/**
 * @file 获取影视剧推荐集合列表
 */
import dayjs from "dayjs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { ModelQuery } from "@/domains/store/types";
import { Member } from "@/domains/user/member";
import { CollectionTypes, MediaTypes } from "@/constants/index";
import { response_error_factory } from "@/utils/server";
import { to_number } from "@/utils/primitive";
import { parseJSONStr } from "@/utils/index";

type MediaPayload = {
  id: string;
  type: number;
  tv_id?: string;
  season_text?: string;
  name: string;
  poster_path: string;
  air_date: string;
  text: string;
};

export default async function v0_wechat_collection_list(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const {
    type: type_str = CollectionTypes.Manually,
    page: page_str,
    page_size: page_size_str,
  } = req.body as Partial<{
    type: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const type = to_number(type_str, 1);
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  let queries: NonNullable<ModelQuery<"collection">>[] = [];
  const where: ModelQuery<"collection"> = {
    type,
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
  const result: {
    id: string;
    type: CollectionTypes;
    title: string;
    desc: string | null;
    medias: MediaPayload[];
  }[] = [];
  for (let i = 0; i < list.length; i += 1) {
    (() => {
      const collection = list[i];
      const { id, type, title, desc, medias, seasons, movies } = collection;
      function build() {
        result.push({
          id,
          type,
          title,
          desc,
          medias: [
            ...seasons.map((season) => {
              const { id, tv } = season;
              const { name, poster_path } = tv.profile;
              return {
                id,
                type: MediaTypes.Season,
                name,
                poster_path,
                air_date: season.profile.air_date,
                tv_id: tv.id,
                season_text: season.season_text,
                created: dayjs(season.created).unix(),
                text: (() => {
                  const cur_episode_count = season._count.episodes;
                  const episode_count = season.profile.episode_count;
                  if (cur_episode_count === episode_count) {
                    return `全${episode_count}集`;
                  }
                  return `更新至${cur_episode_count}集`;
                })(),
              } as MediaPayload;
            }),
            ...movies.map((movie) => {
              const { id, profile } = movie;
              const { name, poster_path } = profile;
              return {
                id,
                type: MediaTypes.Movie,
                name,
                poster_path,
                air_date: movie.profile.air_date,
                text: "",
                created: dayjs(movie.created).unix(),
              } as MediaPayload;
            }),
          ],
        });
      }
      if (medias === null) {
        build();
        return;
      }
      const r = parseJSONStr<MediaPayload[]>(medias);
      if (r.error) {
        build();
        return;
      }
      result.push({
        id,
        type,
        title,
        desc,
        medias: [...r.data],
      });
    })();
  }
  const data = {
    total: count,
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
    list: result,
  };
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
