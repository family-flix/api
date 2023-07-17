/**
 * @file 获取 tv 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { store } from "@/store";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { normalize_partial_tv } from "@/domains/tv/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.tv.findMany>[0]>["where"] = {
    profile: {
      OR: name
        ? [
            {
              name: {
                contains: name,
              },
            },
            {
              original_name: {
                contains: name,
              },
            },
          ]
        : undefined,
    },
    episodes: {
      some: {},
    },
    user_id,
  };
  const count = await store.prisma.tv.count({
    where,
  });
  const list = await store.prisma.tv.findMany({
    where,
    include: {
      _count: true,
      profile: true,
      parsed_tvs: {
        include: {
          binds: {
            orderBy: {
              created: "desc",
            },
          },
        },
      },
      episodes: {
        include: {
          profile: true,
          _count: true,
          parsed_episodes: true,
        },
        orderBy: {
          episode_number: "desc",
        },
      },
    },
    orderBy: {
      profile: { first_air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    no_more: list.length + (page - 1) * page_size >= count,
    page,
    page_size,
    list: list.map((tv) => {
      return normalize_partial_tv(tv);
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
