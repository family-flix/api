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
    page_size = 20,
    next_marker,
  } = req.body as Partial<{
    status: number;
    page_size: number;
    next_marker: string;
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
  const count = await store.prisma.async_task.count({ where });
  const result = await store.list_with_cursor({
    fetch(extra) {
      return store.prisma.async_task.findMany({
        where,
        orderBy: {
          created: "desc",
        },
        ...extra,
      });
    },
    next_marker,
    page_size,
  });
  const data = {
    total: count,
    next_marker: result.next_marker,
    list: result.list.map((item) => {
      const { id, type, desc, status, error, output_id, created, updated } = item;
      return {
        id,
        desc,
        status,
        type,
        error,
        output_id,
        created,
        updated,
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
