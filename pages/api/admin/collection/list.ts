/**
 * @file 管理后台/获取集合列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    type: type_str = "0",
    name,
    page: page_str,
    page_size: page_size_str,
  } = req.query as Partial<{
    type: string;
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const type = to_number(type_str, 1);
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
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
    type,
    user_id: user.id,
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
            const { id, tv } = season;
            const { name, poster_path } = tv.profile;
            return {
              id,
              name,
              poster_path,
              type: 1,
            };
          })
          .concat(
            movies.map((movie) => {
              const { id, profile } = movie;
              const { name, poster_path } = profile;
              return {
                id,
                name,
                poster_path,
                type: 2,
              };
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
