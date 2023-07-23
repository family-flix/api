/**
 * @file 获取电影列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, resultify } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

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
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
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
    parsed_movies: { some: {} },
    user_id: member.user.id,
  };
  const count = await store.prisma.movie.count({
    where,
  });
  const list = await store.prisma.movie.findMany({
    where,
    include: {
      profile: true,
    },
    orderBy: {
      profile: { air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,

    list: list.map((tv) => {
      const { id, profile } = tv;
      const { name, original_name, overview, poster_path, air_date } = profile;
      return {
        id,
        name: name || original_name,
        overview,
        poster_path,
        first_air_date: air_date,
      };
    }),
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
