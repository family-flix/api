/**
 * @file 存在的问题的电视剧/电影
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ModelQuery } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";
import { parseJSONStr } from "@/utils/index";

export default async function v2_admin_media_invalid(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
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
  const result = await store.list_with_cursor({
    fetch(args) {
      return store.prisma.invalid_media.findMany({
        where,
        include: {
          media: {
            include: {
              profile: true,
              histories: {
                include: {
                  member: true,
                },
                take: 10,
              },
            },
          },
        },
        orderBy: {
          media: {
            profile: {
              air_date: "desc",
            },
          },
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  const data = {
    total: count,
    next_marker: result.next_marker,
    list: result.list.map((tip) => {
      const {
        media: { id, type, profile, histories },
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
          air_date: profile.air_date,
          poster_path: profile.poster_path,
          histories: histories.map((history) => {
            const { updated, member } = history;
            return {
              updated,
              member_name: member.remark,
            };
          }),
        },
        tips: (() => {
          if (d.error) {
            return [];
          }
          return d.data.tips;
        })(),
      };
    }),
  };
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
