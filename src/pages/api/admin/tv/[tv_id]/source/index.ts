/**
 * @file 管理后台/获取电视剧关联的文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    tv_id: id,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.body as Partial<{ tv_id: string; page: string; page_size: string }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.parsed_episode.findMany>[number]>["where"] = {
    parsed_tv: {
      tv: {
        id: id,
        user_id,
      },
    },
  };
  const count = await store.prisma.parsed_episode.count({ where });
  const list = await store.prisma.parsed_episode.findMany({
    where,
    include: {
      drive: true,
    },
    take: page_size,
    skip: (page - 1) * page_size,
    orderBy: {
      file_name: "asc",
    },
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      total: count,
      page,
      page_size,
      no_more: (page - 1) * page_size + list.length >= count,
      list: list.map((source) => {
        const { id, file_id, file_name, parent_paths, drive, drive_id } = source;
        const { name } = drive;
        return {
          id,
          file_id,
          file_name,
          parent_paths,
          drive: {
            id: drive_id,
            name,
          },
        };
      }),
    },
  });
}
