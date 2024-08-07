/**
 * @file 管理后台/获取集合详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { parseJSONStr } from "@/utils/index";

export default async function v2_admin_collection_profile(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少集合 id"));
  }
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
  const { type, sort, title, desc, extra, medias } = collection;
  const r = parseJSONStr<{ orders: Record<string, number> }>(extra);
  const data = {
    id,
    title,
    desc,
    sort,
    type,
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
  return res.status(200).json({ code: 0, msg: "", data });
}
