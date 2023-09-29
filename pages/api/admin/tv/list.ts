/**
 * @file 获取 tv 列表
 * @deprecated
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { store } from "@/store";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { normalize_partial_tv } from "@/domains/media_thumbnail/utils";
import { TVProfileWhereInput } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    genres,
    language,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    name: string;
    genres: string;
    language: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  // const page = Number(page_str);
  // const page_size = Number(page_size_str);
  // let queries: TVProfileWhereInput[] = [];
  // if (name) {
  //   queries = queries.concat({
  //     OR: [
  //       {
  //         name: {
  //           contains: name,
  //         },
  //       },
  //       {
  //         original_name: {
  //           contains: name,
  //         },
  //       },
  //     ],
  //   });
  // }
  // if (genres) {
  //   queries = queries.concat({
  //     OR: genres.split("|").map((g) => {
  //       return {
  //         genres: {
  //           contains: g,
  //         },
  //       };
  //     }),
  //   });
  // }
  // if (language) {
  //   queries = queries.concat({
  //     OR: language.split("|").map((g) => {
  //       return {
  //         origin_country: {
  //           contains: g,
  //         },
  //       };
  //     }),
  //   });
  // }
  // const where: NonNullable<Parameters<typeof store.prisma.tv.findMany>[0]>["where"] = {
  //   episodes: {
  //     some: {},
  //   },
  //   user_id,
  // };
  // if (queries.length !== 0) {
  //   where.profile = {
  //     AND: queries,
  //   };
  // }
  // const count = await store.prisma.tv.count({
  //   where,
  // });
  // const list = await store.prisma.tv.findMany({
  //   where,
  //   include: {
  //     _count: true,
  //     profile: true,
  //     parsed_tvs: true,
  //     episodes: {
  //       include: {
  //         profile: true,
  //         _count: true,
  //         parsed_episodes: true,
  //       },
  //       orderBy: {
  //         episode_number: "desc",
  //       },
  //     },
  //   },
  //   orderBy: {
  //     profile: { first_air_date: "desc" },
  //   },
  //   skip: (page - 1) * page_size,
  //   take: page_size,
  // });
  // const data = {
  //   total: count,
  //   no_more: list.length + (page - 1) * page_size >= count,
  //   page,
  //   page_size,
  //   list: list.map((tv) => {
  //     return normalize_partial_tv(tv);
  //   }),
  // };
  res.status(200).json({
    code: 0,
    msg: "",
    data: null,
  });
}
