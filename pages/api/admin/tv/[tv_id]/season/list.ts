/**
 * @file 获取 tv 的季列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { store } from "@/store";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { ModelQuery } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    tv_id,
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    tv_id: string;
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  if (!tv_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: ModelQuery<typeof store.prisma.season.findMany>["where"] = {
    tv_id,
    //     profile: {
    //       OR: name
    //         ? [
    //             {
    //               name: {
    //                 contains: name,
    //               },
    //             },
    //           ]
    //         : undefined,
    //     },
    //     episodes: {
    //       some: {},
    //     },
    user_id,
  };
  const count = await store.prisma.season.count({
    where,
  });
  const list = await store.prisma.season.findMany({
    where,
    include: {
      profile: true,
      episodes: {
        include: {
          profile: true,
          _count: true,
          parsed_episodes: true,
        },
        orderBy: {
          episode_number: "desc",
        },
      },
    },
    orderBy: {
      season_number: "asc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    no_more: list.length + (page - 1) * page_size >= count,
    page,
    page_size,
    list: list.map((season) => {
      const { id, profile } = season;
      return {
        id,
        name: profile.name,
        overview: profile.overview,
        first_air_date: profile.air_date,
        poster_path: profile.poster_path,
        episode_count: profile.episode_count,
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
