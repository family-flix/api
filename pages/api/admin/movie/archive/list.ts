/**
 * @file 获取待归档的电影列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery, SeasonProfileWhereInput } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { to_number } from "@/utils/primitive";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    drive_ids,
    page: page_str,
    page_size: page_size_str,
    next_marker = "",
  } = req.query as Partial<{
    name: string;
    drive_ids: string;
    page: string;
    page_size: string;
    next_marker: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  let queries: SeasonProfileWhereInput[] = [];
  const where: ModelQuery<"movie"> = {
    parsed_movies: {
      some: drive_ids
        ? {
            drive_id: {
              in: drive_ids.split("|"),
            },
          }
        : {},
    },
    user_id: user.id,
  };
  if (name) {
    where.profile = {
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
    };
  }
  if (queries.length !== 0) {
    where.profile = {
      AND: queries,
    };
  }
  const count = await store.prisma.movie.count({
    where,
  });
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.movie.findMany({
        where,
        include: {
          profile: true,
          parsed_movies: {
            include: {
              drive: true,
            },
          },
        },
        orderBy: {
          profile: { air_date: "asc" },
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  const data = {
    total: count,
    list: result.list.map((movie) => {
      const { id, profile, parsed_movies } = movie;
      const { name, original_name, air_date } = profile;
      const sources = parsed_movies.map((source) => {
        const { id, file_id, file_name, parent_paths, size, drive } = source;
        return {
          id,
          file_id,
          file_name,
          parent_paths,
          size,
          drive: {
            id: drive.id,
            name: drive.name,
            type: drive.type,
          },
        };
      });
      return {
        id,
        name: name || original_name,
        original_name,
        poster_path: profile.poster_path,
        air_date: air_date,
        medias: [
          {
            id,
            name: name || original_name,
            sources,
          },
        ],
      };
    }),
    next_marker: result.next_marker,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
