/**
 * @file 获取分享资源查询记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    page: page_str,
    page_size: page_size_str,
  } = req.body as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const t_resp = await User.New(authorization, store);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  const where: ModelQuery<"shared_file"> = {
    user_id,
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
  res.status(200).json({
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
