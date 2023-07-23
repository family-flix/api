/**
 * @file 搜索索引到的所有云盘下的文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { bytes_to_size } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    page: page_str = "1",
    page_size: page_size_str = "20",
    type: type_str,
    name,
  } = req.query as Partial<{ page: string; page_size: string; type: string; name: string }>;
  const { order } = req.body as {
    order: Record<string, "asc" | "desc">;
  };

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const type = type_str ? Number(type_str) : null;

  const where = (() => {
    const where: NonNullable<Parameters<typeof store.prisma.file.findMany>[number]>["where"] = {
      user_id: user.id,
    };
    if (name !== undefined) {
      where.OR = [
        {
          name: {
            contains: name,
          },
        },
        {
          parent_paths: {
            contains: name,
          },
        },
      ];
    }
    if (type !== null) {
      where.type = type;
    }
    return where;
  })();
  const orderBy = (() => {
    let orderBy: NonNullable<Parameters<typeof store.prisma.file.findMany>[number]>["orderBy"] = {
      name: "desc",
    };
    if (order) {
      orderBy = order;
    }
    return orderBy;
  })();
  const count = await store.prisma.file.count({
    where,
  });
  const list = await store.prisma.file.findMany({
    where,
    include: {
      drive: true,
    },
    take: page_size,
    skip: (page - 1) * page_size,
    orderBy,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      total: count,
      no_more: list.length + (page - 1) * page_size >= count,
      list: list.map((file) => {
        const { id, file_id, name, parent_paths, type, size, drive } = file;
        return {
          id,
          file_id,
          unique_id: file_id,
          name,
          parent_paths,
          type,
          size: bytes_to_size(size ?? 0),
          drive: {
            id: drive.id,
            name: drive.name,
            avatar: drive.avatar,
          },
        };
      }),
    },
  });
}
