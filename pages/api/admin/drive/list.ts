/**
 * @file 获取云盘列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { page: page_str = "1", page_size: page_size_str = "10" } = req.query as { page: string; page_size: string };
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.drive.findMany>[number]>["where"] = {
    user_id,
  };
  const count = await store.prisma.drive.count({ where });
  const list = await store.prisma.drive.findMany({
    where,
    skip: (page - 1) * page_size,
    take: page_size,
    orderBy: {
      created: "desc",
    },
  });
  // const { list, page, page_size, total, no_more } = r.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      total: count,
      no_more: list.length + (page - 1) >= count,
      list: list.map((drive) => {
        const { id, name, avatar, total_size, used_size, root_folder_id } = drive;
        return {
          id,
          name,
          avatar,
          total_size,
          used_size,
          root_folder_id,
        };
      }),
    },
  });
}
