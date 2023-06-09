/**
 * @file 获取未识别的电影
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { query } = req;
  const { page: page_str = "1", page_size: page_size_str = "20" } = query as Partial<{
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);

  const where: NonNullable<Parameters<typeof store.prisma.parsed_movie.findMany>[number]>["where"] = {
    movie_id: null,
    user_id,
  };
  const list = await store.prisma.parsed_movie.findMany({
    where,
    orderBy: {
      created: "desc",
    },
    take: page_size,
    skip: (page - 1) * page_size,
  });
  const count = await store.prisma.parsed_movie.count({ where });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      total: count,
      no_more: list.length + (page - 1) * page_size >= count,
      list: list.map((parsed_season) => {
        const { id, name, original_name, file_name } = parsed_season;
        return {
          id,
          name,
          original_name,
          file_name,
        };
      }),
    },
  });
}
