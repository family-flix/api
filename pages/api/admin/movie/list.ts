/**
 * @file 获取电影列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { store } from "@/store";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_resp = await User.New(authorization, store);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.movie.findMany>[0]>["where"] = {
    profile: {
      OR: name
        ? [
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
          ]
        : undefined,
    },
    user_id,
  };
  const count = await store.prisma.movie.count({
    where,
  });
  const list = await store.prisma.movie.findMany({
    where,
    include: {
      profile: true,
      parsed_movies: true,
    },
    orderBy: {
      profile: { air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    no_more: list.length + (page - 1) * page_size >= count,
    page,
    page_size,
    list: list.map((tv) => {
      const { id, profile } = tv;
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
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
