/**
 * @file 获取解析出的所有电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";
import { ModelQuery } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    page: page_str,
    page_size: page_size_str,
    can_search,
  } = req.query as Partial<{
    name: string;
    page: string;
    can_search: string;
    page_size: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  const where: ModelQuery<"parsed_tv"> = {
    user_id: user.id,
  };
  if (can_search) {
    where.can_search = to_number(can_search, 0);
  }
  if (name) {
    where.file_name = {
      contains: name,
    };
  }
  const list = await store.prisma.parsed_tv.findMany({
    where,
    include: {
      tv: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: {
      created: "desc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const count = await store.prisma.parsed_tv.count({
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
