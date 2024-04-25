/**
 * @file 获取解析出的所有季
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
    can_search,
  } = req.body as Partial<{
    name: string;
    page: string;
    can_search: string;
    page_size: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.parsed_season.findMany>[number]>["where"] = {
    // can_search: can_search ? Number(can_search) : undefined,
    season_id: null,
    user_id,
  };
  if (name) {
    where.file_name = {
      contains: name,
    };
  }
  const list = await store.prisma.parsed_season.findMany({
    where,
    // include: {
    //   parsed_tv: {
    //     include: {
    //       tv: {
    //         include: {
    //           profile: true,
    //         },
    //       },
    //     },
    //   },
    // },
    orderBy: {
      created: "desc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const count = await store.prisma.parsed_season.count({
    where,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      total: count,
      list,
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
    },
  });
}
