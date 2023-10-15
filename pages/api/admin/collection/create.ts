/**
 * @file 管理后台/创建集合
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { CollectionTypes, MediaTypes } from "@/constants";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    title,
    type,
    desc,
    medias,
    sort = 0,
    rules,
    styles,
  } = req.body as Partial<{
    title: string;
    desc: string;
    sort: number;
    type: number;
    medias: { id: string; type: number }[];
    rules: Record<string, unknown>;
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
  await store.prisma.collection.create({
    data: {
      id: r_id(),
      title,
      desc,
      sort,
      type: CollectionTypes.Manually,
      seasons: {
        connect: medias
          .filter((media) => media.type === MediaTypes.Season)
          .map((media) => {
            return {
              id: media.id,
            };
          }),
      },
      movies: {
        connect: medias
          .filter((media) => media.type === MediaTypes.Movie)
          .map((media) => {
            return {
              id: media.id,
            };
          }),
      },
      user_id: user.id,
    },
  });
  res.status(200).json({ code: 0, msg: "创建成功", data: null });
}
