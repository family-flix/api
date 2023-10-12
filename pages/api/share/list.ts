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
  const where: ModelQuery<"episode"> = {
    user_id: user.id,
  };
  const data = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.shared_media.findMany({
        where,
        include: {
          season: {
            include: {
              profile: true,
            },
          },
          movie: {
            include: {
              profile: true,
            },
          },
        },
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
