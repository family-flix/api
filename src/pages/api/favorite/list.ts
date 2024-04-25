/**
 * @file 使用游标而非分页的列表接口
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

enum FavoriteRecordTypes {
  Season = 1,
  Movie = 2,
  Collection = 3,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { next_marker = "", page_size = 20 } = req.body as Partial<{
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const where: ModelQuery<"member_favorite"> = {
    member_id: member.id,
  };
  const data = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.member_favorite.findMany({
        where,
        include: {
          media: {
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
    data: {
      ...data,
      list: data.list.map((record) => {
        const { id, type, media } = record;
        return {
          id,
          type,
          payload: (() => {
            // if (type === FavoriteRecordTypes.Season) {
            //   return season;
            // }
            // if (type === FavoriteRecordTypes.Movie) {
            //   return movie;
            // }
            // if (type === FavoriteRecordTypes.Collection) {
            //   return collection;
            // }
            return null;
          })(),
        };
      }),
    },
  });
}
