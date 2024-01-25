/**
 * @file 存在的问题的电视剧/电影
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { parseJSONStr } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    type,
    next_marker = "",
    page_size = 20,
  } = req.body as Partial<{ next_marker: string; page_size: number; type: number }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: ModelQuery<"invalid_media"> = {
    media: {
      profile: {
        order: {
          not: 0,
        },
      },
    },
    user_id: user.id,
  };
  if (type !== undefined) {
    where.type = type;
  }
  const count = await store.prisma.invalid_media.count({ where });
  const data = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.invalid_media.findMany({
        where,
        include: {
          media: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: [
          {
            media: {
              profile: {
                air_date: "asc",
              },
            },
          },
          {
            type: "asc",
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
    data: {
      total: count,
      next_marker: data.next_marker,
      list: data.list.map((tip) => {
        const {
          media: { id, type, profile },
          profile: text,
        } = tip;
        const d = parseJSONStr<{ tips: string[] }>(text);
        return {
          id: tip.id,
          type: tip.type,
          media: {
            id,
            type,
            name: profile.name,
            poster_path: profile.poster_path,
          },
          tips: (() => {
            if (d.error) {
              return [];
            }
            return d.data.tips;
          })(),
        };
      }),
    },
  });
}
