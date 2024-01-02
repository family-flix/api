/**
 * @file 每日更新的影视剧默认是草稿状态，通过该接口，会复制一份草稿到实际的「每日更新」
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { CollectionTypes } from "@/constants";
import { r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const draft = await store.prisma.collection_v2.findFirst({
    where: {
      type: CollectionTypes.DailyUpdateDraft,
      user_id: user.id,
    },
    include: {
      medias: true,
    },
  });
  if (!draft) {
    return e(Result.Err("没有草稿"));
  }
  const daily = await (async () => {
    const existing = await store.prisma.collection_v2.findFirst({
      where: {
        type: CollectionTypes.DailyUpdate,
        user_id: user.id,
      },
    });
    if (!existing) {
      const created = await store.prisma.collection_v2.create({
        data: {
          id: r_id(),
          title: draft.title,
          type: CollectionTypes.DailyUpdate,
          user_id: user.id,
        },
      });
      return created;
    }
    return existing;
  })();
  await store.prisma.collection_v2.update({
    where: {
      id: daily.id,
    },
    data: {
      title: draft.title,
      type: CollectionTypes.DailyUpdate,
      medias: {
        connect: draft.medias.map((media) => {
          return {
            id: media.id,
          };
        }),
      },
      user_id: user.id,
    },
  });
  res.status(200).json({ code: 0, msg: "", data: null });
}
