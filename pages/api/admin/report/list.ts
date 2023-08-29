/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { ModelQuery } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { page: page_str = "1", page_size: page_size_str = "20" } = req.query as Partial<{
    name: string;
    genres: string;
    language: string;
    drive_id: string;
    season_number: string;
    invalid: string;
    duplicated: string;
    page: string;
    page_size: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id } = user;
  const page = Number(page_str);
  const page_size = Number(page_size_str);

  const where: ModelQuery<typeof store.prisma.report.findMany>["where"] = {
    user_id,
  };
  const count = await store.prisma.report.count({ where });
  const list = await store.prisma.report.findMany({
    where,
    include: {
      member: true,
      tv: {
        include: {
          profile: true,
        },
      },
      episode: {
        include: {
          profile: true,
        },
      },
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
    orderBy: {
      created: 'desc'
    }
  });

  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
      total: count,
      list: list.map((report) => {
        const { id, type, member, tv, season, episode, movie, data, created } = report;
        return {
          id,
          type,
          member: {
            id: member.id,
            name: member.remark,
          },
          data,
          created,
        };
      }),
    },
  });
}
