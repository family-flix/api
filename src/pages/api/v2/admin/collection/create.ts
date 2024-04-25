/**
 * @file 管理后台/创建集合
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { Result } from "@/types/index";
import { CollectionTypes } from "@/constants/index";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils/index";

export default async function v2_admin_collection_create(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    title,
    type,
    desc,
    medias,
    sort = 0,
    rules,
    orders,
    styles,
  } = req.body as Partial<{
    title: string;
    desc: string;
    sort: number;
    type: CollectionTypes;
    medias: { id: string; type: number }[];
    rules: Record<string, unknown>;
    orders: Record<string, unknown>;
    styles: Record<string, unknown>;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!title) {
    return e(Result.Err("缺少 title"));
  }
  if (!medias?.length) {
    return e(Result.Err("缺少集合内容"));
  }
  await store.prisma.collection_v2.create({
    data: {
      id: r_id(),
      title,
      desc,
      sort,
      type: CollectionTypes.Manually,
      extra: (() => {
        if (!orders) {
          return "{}";
        }
        return JSON.stringify({
          orders,
        });
      })(),
      medias: {
        connect: medias.map((media) => {
          const { id } = media;
          return {
            id,
          };
        }),
      },
      user_id: user.id,
    },
  });
  return res.status(200).json({ code: 0, msg: "创建成功", data: null });
}
