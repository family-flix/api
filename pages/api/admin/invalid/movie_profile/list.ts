/**
 * @file 获取有问题的电视剧详情列表
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
  const page_size = to_number(page_size_str, 20);
  const duplicated_profile_ids = await store.prisma.movie_profile.groupBy({
    by: ["unique_id"],
    having: {
      unique_id: {
        _count: {
          gt: 1,
        },
      },
    },
  });
  const where: ModelQuery<"movie_profile"> = {
    unique_id: {
      in: duplicated_profile_ids.map((id) => id.unique_id),
    },
  };
  const data = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.movie_profile.findMany({
        where,
        include: {
          movies: true,
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
