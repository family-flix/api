/**
 * @file 获取 权限 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { TVProfileWhereInput } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
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
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id } = user;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  //   let queries: TVProfileWhereInput[] = [];
  //   if (name) {
  //     queries = queries.concat({
  //       OR: [
  //         {
  //           name: {
  //             contains: name,
  //           },
  //         },
  //         {
  //           original_name: {
  //             contains: name,
  //           },
  //         },
  //       ],
  //     });
  //   }
  const where: NonNullable<Parameters<typeof store.prisma.permission.findMany>[0]>["where"] = {
    user_id,
  };
  //   if (queries.length !== 0) {
  //     where.tv = {
  //       profile: {
  //         AND: queries,
  //       },
  //     };
  //   }
  const count = await store.prisma.permission.count({
    where,
  });
  const list = await store.prisma.permission.findMany({
    where,
    orderBy: {
      created: "desc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
    list,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
