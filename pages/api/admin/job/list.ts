/**
 * @file 获取任务列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { store } from "@/store";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { page: page_str = "1", page_size: page_size_str = "20" } = req.query as Partial<{
    page: string;
    page_size: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);

  const where = {
    user_id,
  };
  const list = await store.prisma.async_task.findMany({
    where,
    skip: (page - 1) * page_size,
    take: page_size,
    orderBy: {
      created: "desc",
    },
  });
  const count = await store.prisma.async_task.count({ where });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      list,
      page,
      page_size,
      total: count,
      no_more: list.length + (page - 1) * page_size >= count,
    },
  });
}
