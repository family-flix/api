/**
 * @file 获取分享资源查询记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_sync_task_search_history(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    page = 1,
    page_size = 20,
  } = req.body as Partial<{
    name: string;
    page: number;
    page_size: number;
  }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  const where: ModelQuery<"shared_file"> = {
    user_id: user.id,
  };
  if (name) {
    where.title = {
      contains: name,
    };
  }
  const count = await store.prisma.shared_file.count({ where });
  const list = await store.prisma.shared_file.findMany({
    where,
    orderBy: {
      created: "desc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      total: count,
      list: list.map((record) => {
        const { id, url, title } = record;
        return {
          id,
          url,
          title,
        };
      }),
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
    },
  });
}
