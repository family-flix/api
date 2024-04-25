/**
 * @file 获取未识别的电影
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
  const { body: query } = req;
  const {
    name,
    page: page_str,
    page_size: page_size_str,
  } = query as Partial<{
    page: string;
    page_size: string;
    name: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  const where: ModelQuery<"parsed_movie"> = {
    movie_id: null,
    user_id: user.id,
  };
  if (name) {
    where.OR = [
      {
        name: {
          contains: name,
        },
      },
      {
        file_name: {
          contains: name,
        },
      },
    ];
  }
  const count = await store.prisma.parsed_movie.count({ where });
  const list = await store.prisma.parsed_movie.findMany({
    where,
    include: {
      drive: true,
    },
    orderBy: {
      created: "desc",
    },
    take: page_size,
    skip: (page - 1) * page_size,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      total: count,
      no_more: list.length + (page - 1) * page_size >= count,
      list: list.map((parsed_movie) => {
        const { id, name, original_name, file_id, file_name, parent_paths, drive } = parsed_movie;
        return {
          id,
          name,
          original_name,
          file_id,
          file_name,
          parent_paths,
          drive: {
            id: drive.id,
            name: drive.name,
            avatar: drive.avatar,
          },
        };
      }),
    },
  });
}
