/**
 * @file 获取未识别的季
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { to_number } from "@/utils/primitive";
import { ModelQuery } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { query } = req;
  const { page: page_str, page_size: page_size_str } = query as Partial<{
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  const where: ModelQuery<"parsed_season"> = {
    season_id: null,
    user_id,
  };
  const list = await store.prisma.parsed_season.findMany({
    where,
    include: {
      parsed_tv: {
        include: {
          tv: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
    orderBy: {
      created: "desc",
    },
    take: page_size,
    skip: (page - 1) * page_size,
  });
  const count = await store.prisma.parsed_season.count({ where });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      total: count,
      no_more: list.length + (page - 1) * page_size >= count,
      list: list.map((parsed_season) => {
        const { id, season_number, parsed_tv } = parsed_season;
        const profile = (() => {
          if (!parsed_tv.tv) {
            return {
              name: parsed_tv.name,
              poster_path: null,
            };
          }
          const { name, poster_path } = parsed_tv.tv.profile;
          return {
            name,
            poster_path,
          };
        })();
        return {
          id,
          season_number,
          name: profile.name,
          profile,
        };
      }),
    },
  });
}
