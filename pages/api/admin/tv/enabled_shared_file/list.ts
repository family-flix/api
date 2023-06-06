/**
 * @file 管理后台/关联一个分享资源
 * 用于定时从该分享资源转存新增的视频文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    page: page_str = "1",
    page_size: page_size_str = "20",
    name,
  } = req.body as Partial<{
    page: string;
    page_size: string;
    name: string[];
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.shared_file_in_progress.findMany>[0]>["where"] = {
    OR: name
      ? name.map((n) => {
          return {
            name: {
              contains: n,
            },
          };
        })
      : undefined,
    user_id,
  };
  const list = await store.prisma.shared_file_in_progress.findMany({
    where,
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const count = await store.prisma.shared_file_in_progress.count({
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
