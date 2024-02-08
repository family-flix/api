/**
 * @file 存在问题的剧集列表
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
    type,
    page_size = 20,
    next_marker = "",
  } = req.body as Partial<{ next_marker: string; page_size: number; type: number }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: ModelQuery<"invalid_media_source"> = {
    user_id: user.id,
  };
  if (type !== undefined) {
    where.type = type;
  }
  const data = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.invalid_media_source.findMany({
        where,
        orderBy: [
          {
            type: "asc",
          },
          {
            media_source: {
              profile: {
                order: "asc",
              },
            },
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
