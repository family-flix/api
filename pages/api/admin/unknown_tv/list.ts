/**
 * @file 获取未识别的文件夹列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { query } = req;
  const {
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.parsed_tv.findMany>[number]>["where"] = {
    tv_id: null,
    user_id,
  };
  if (name) {
    where.OR = [
      {
        name: {
          contains: name,
        },
      },
      {
        file_name: {
          contains: name,
        },
      },
    ];
  }
  const count = await store.prisma.parsed_tv.count({ where });
  const list = await store.prisma.parsed_tv.findMany({
    where,
    select: {
      id: true,
      name: true,
      original_name: true,
      file_name: true,
    },
    take: page_size,
    skip: (page - 1) * page_size,
    orderBy: {
      created: "asc",
    },
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
      total: count,
      list,
    },
  });
}
