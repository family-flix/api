/**
 * @file 清除所有无效的文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { ModelParam, ModelQuery } from "@/domains/store/types";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { next_marker = "", page_size: page_size_str } = req.query as Partial<{
    next_marker: string;
    page_size: string;
  }>;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page_size = to_number(page_size_str, 20);

  let no_more = false;
  const where: ModelQuery<"file"> = {
    user_id: user.id,
  };
  const count = await store.prisma.file.count({ where });
  //   do {
  const list = await store.prisma.file.findMany({
    where,
    take: page_size + 1,
    ...(() => {
      const cursor: { id?: string } = {};
      if (next_marker) {
        cursor.id = next_marker;
        return {
          cursor,
        };
      }
      return {} as ModelParam<typeof store.prisma.file.findMany>["cursor"];
    })(),
  });
  no_more = list.length < page_size + 1;
  let new_next_marker = "";
  if (list.length === page_size + 1) {
    const last_record = list[list.length - 1];
    new_next_marker = last_record.id;
  }
  const correct_list = list.slice(0, page_size);
  //   } while (no_more === false);

  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      next_marker: new_next_marker,
      list: correct_list,
      total: count,
    },
  });
}
