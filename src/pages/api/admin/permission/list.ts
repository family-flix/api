/**
 * @file 获取 权限 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { response_error_factory } from "@/utils/server";

export default async function v0_admin_permission_list(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const {
    name,
    page = 1,
    page_size = 2,
  } = req.body as Partial<{
    name: string;
    page: number;
    page_size: number;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: NonNullable<Parameters<typeof store.prisma.permission.findMany>[0]>["where"] = {
    user_id: user.id,
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
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
