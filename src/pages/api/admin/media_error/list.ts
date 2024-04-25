/**
 * @file 使用游标而非分页的列表接口
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    next_marker = "",
    type,
    page_size = 20,
  } = req.body as Partial<{
    next_marker: string;
    page_size: number;
    type: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: ModelQuery<"media_error_need_process"> = {
    user_id: user.id,
  };
  if (type !== undefined) {
    where.type = type;
  }
  const data = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.media_error_need_process.findMany({
        where,
        orderBy: [
          {
            type: "asc",
          },
          {
            unique_id: "desc",
          },
        ],
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
