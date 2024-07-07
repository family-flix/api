/**
 * @file 管理后台/编辑集合
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { CollectionTypes } from "@/constants/index";

export default async function v2_admin_collection_edit(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    id,
    type,
    title,
    desc,
    medias,
    orders,
    sort = 0,
  } = req.body as Partial<{
    id: string;
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
  if (!id) {
    return e(Result.Err("缺少 id"));
  }
  if (!title) {
    return e(Result.Err("缺少 title"));
  }
  if (!medias?.length) {
    return e(Result.Err("缺少集合内容"));
  }
  const existing = await store.prisma.collection_v2.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!existing) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.collection_v2.update({
    where: {
      id: existing.id,
    },
    data: {
      title,
      desc,
      sort,
      type,
      extra: (() => {
        if (!orders) {
          return "{}";
        }
        return JSON.stringify({
          orders,
        });
      })(),
      medias: {
        set: medias.map((media) => {
          return {
            id: media.id,
          };
        }),
      },
      user_id: user.id,
    },
  });
  return res.status(200).json({ code: 0, msg: "编辑成功", data: null });
}
