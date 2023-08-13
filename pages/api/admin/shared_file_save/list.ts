/**
 * @file 获取分享资源查询记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const t_resp = await User.New(authorization, store);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: ModelQuery<typeof store.prisma.shared_file_in_progress.findMany>["where"] = {
    user_id,
  };
  if (name) {
    where.name = {
      contains: name,
    };
  }
  const count = await store.prisma.shared_file_in_progress.count({ where });
  const list = await store.prisma.shared_file_in_progress.findMany({
    where,
    include: {
      drive: true,
    },
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
        const { id, url, name, drive } = record;
        return {
          id,
          url,
          name,
          drive: {
            id: drive.id,
            name: drive.name,
            avatar: drive.avatar,
          },
        };
      }),
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
    },
  });
}
