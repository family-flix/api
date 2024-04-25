/**
 * @file 添加
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { r_id } from "@/utils";

enum FavoriteRecordTypes {
  Season = 1,
  Movie = 2,
  Collection = 3,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, type } = req.body as Partial<{ type: FavoriteRecordTypes; id: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!type) {
    return e(Result.Err("缺少喜欢的内容类型"));
  }
  if (!id) {
    return e(Result.Err("缺少喜欢的内容记录"));
  }
  const member = t_res.data;
  const payload = await (async () => {
    if (type === FavoriteRecordTypes.Season) {
      const r = await store.prisma.season.findFirst({
        where: {
          id,
          user_id: member.user.id,
        },
      });
      if (r) {
        return r;
      }
    }
    if (type === FavoriteRecordTypes.Movie) {
      const r = await store.prisma.movie.findFirst({
        where: {
          id,
          user_id: member.user.id,
        },
      });
      if (r) {
        return r;
      }
    }
    if (type === FavoriteRecordTypes.Collection) {
      const r = await store.prisma.collection.findFirst({
        where: {
          id,
          user_id: member.user.id,
        },
      });
      if (r) {
        return r;
      }
    }
    return null;
  })();
  if (!payload) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.member_favorite.create({
    data: {
      id: r_id(),
      type,
      media_id: payload.id,
      member_id: member.id,
    },
  });
  res.status(200).json({ code: 0, msg: "添加成功", data: null });
}
