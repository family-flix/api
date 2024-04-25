/**
 * @file 获取 季 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery, TVProfileWhereInput } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    page: page_str,
    page_size: page_size_str,
    size_order = "asc",
  } = req.body as Partial<{
    name: string;
    page: string;
    page_size: string;
    size_order: "asc" | "desc";
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id } = user;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  let queries: NonNullable<ModelQuery<"file">>[] = [];
  if (name) {
    queries = queries.concat({
      OR: [
        {
          name: {
            contains: name,
          },
        },
      ],
    });
  }
  const where: ModelQuery<"file"> = {
    user_id,
  };
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.file.count({
    where,
  });
  const list = await store.prisma.file.findMany({
    where,
    orderBy: {
      size: size_order,
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
    list: list.map((file) => {
      const { id, file_id, name, size, parent_file_id, parent_paths, md5 } = file;
      return {
        id,
        file_id,
        name,
        size,
        parent_file_id,
        parent_paths,
        md5,
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
