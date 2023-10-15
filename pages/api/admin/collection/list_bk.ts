/**
 * @file 管理后台/获取集合列表
 */
import dayjs from "dayjs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { parseJSONStr } from "@/utils";
import { MediaTypes } from "@/constants";

type MediaPayload = {
  id: string;
  type: MediaTypes;
  name: string;
  poster_path: string;
  air_date: string;
  tv_id?: string;
  season_text?: string;
  text: string | null;
  created: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    type,
    name,
    page = 1,
    page_size = 20,
  } = req.body as Partial<{
    type: number;
    name: string;
    page: number;
    page_size: number;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  let queries: NonNullable<ModelQuery<"collection">>[] = [];
  if (name) {
    queries = queries.concat({
      OR: [
        {
          title: {
            contains: name,
          },
        },
      ],
    });
  }
  const where: ModelQuery<"collection"> = {
    user_id: user.id,
  };
  if (type !== undefined) {
    where.type = type;
  }
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
          tv: {
            include: {
              profile: true,
            },
          },
          profile: true,
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
    title: string;
    desc: string | null;
    medias: MediaPayload[];
  }[] = [];
  for (let i = 0; i < list.length; i += 1) {
    (() => {
      const collection = list[i];
      const { id, title, desc, medias, seasons, movies } = collection;
      const r = parseJSONStr<MediaPayload[]>(medias);
      if (r.error) {
        result.push({
          id,
          title,
          desc,
          medias: seasons
            .map((season) => {
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
                text: "",
                created: dayjs(season.created).unix(),
              } as MediaPayload;
            })
            .concat(
              movies.map((movie) => {
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
              })
            ),
        });
        return;
      }
      result.push({
        id,
        title,
        desc,
        medias: r.data,
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
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
