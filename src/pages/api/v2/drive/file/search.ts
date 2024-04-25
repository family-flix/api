/**
 * @file 搜索索引到的所有云盘下的文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { response_error_factory } from "@/utils/server";
import { bytes_to_size } from "@/utils/index";

export default async function v2_drive_file_search(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    next_marker = "",
    page_size = 20,
    type = null,
    name,
    order,
  } = req.body as Partial<{
    next_marker: string;
    page_size: number;
    type: number | null;
    name: string;
    order: Record<string, "asc" | "desc">;
  }>;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;

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
  const r = await store.list_with_cursor({
    fetch(extra) {
      return store.prisma.file.findMany({
        include: {
          drive: true,
        },
        orderBy,
        ...extra,
      });
    },
    next_marker,
    page_size,
  });
  const count = await store.prisma.file.count({
    where,
  });
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page_size,
      total: count,
      next_marker: r.next_marker,
      list: r.list.map((file) => {
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
