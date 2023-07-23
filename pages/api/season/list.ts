/**
 * @file 获取 季 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

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
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.season.findMany>[0]>["where"] = {
    episodes: {
      some: {},
    },
    user_id: member.user.id,
  };
  if (name) {
    where.tv = {
      profile: {
        OR: [
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
          {
            overview: {
              contains: name,
            },
          },
        ],
      },
    };
  }
  const count = await store.prisma.season.count({
    where,
  });
  const list = await store.prisma.season.findMany({
    where,
    include: {
      profile: true,
      tv: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: {
      profile: { air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    list: list.map((season) => {
      const { id, season_number, profile, tv } = season;
      const { air_date } = profile;
      const { name, original_name, overview, poster_path, popularity } = tv.profile;
      return {
        id,
        tv_id: tv.id,
        name,
        original_name,
        overview,
        season_number,
        poster_path: profile.poster_path || poster_path,
        first_air_date: air_date,
        popularity,
      };
    }),
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
