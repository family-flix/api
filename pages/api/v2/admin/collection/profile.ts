/**
 * @file 管理后台/获取集合详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { parseJSONStr } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少集合 id"));
  }
  const user = t_res.data;
  const collection = await store.prisma.collection_v2.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      medias: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (!collection) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { sort, title, desc, extra, medias } = collection;
  const r = parseJSONStr<{ orders: Record<string, number> }>(extra);
  const data = {
    id,
    title,
    desc,
    sort,
    medias: medias
      .map((season) => {
        const { id, type, profile } = season;
        return {
          id,
          type,
          name: profile.name,
          poster_path: profile.poster_path,
          order: (() => {
            if (r.error) {
              return 9000;
            }
            const orders = r.data.orders;
            if (orders[id] !== undefined) {
              return orders[id];
            }
            return 9000;
          })(),
        };
      })
      .sort((a, b) => a.order - b.order),
  };
  res.status(200).json({ code: 0, msg: "", data });
}
