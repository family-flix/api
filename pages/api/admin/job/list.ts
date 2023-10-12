/**
 * @file 获取任务列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { store } from "@/store";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    status,
    page = 1,
    page_size = 20,
  } = req.body as Partial<{
    status: number;
    page: number;
    page_size: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: ModelQuery<"async_task"> = {
    user_id: user.id,
  };
  if (status) {
    where.status = status;
  }
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
      page,
      page_size,
      total: count,
      no_more: list.length + (page - 1) * page_size >= count,
      list: list.map((item) => {
        const { id, type, desc, status, created, error, unique_id } = item;
        return {
          id,
          desc,
          status,
          type,
          created,
          error,
          unique_id,
        };
      }),
    },
  });
}
