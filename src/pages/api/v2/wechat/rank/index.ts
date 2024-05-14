/**
 * @file 获取影视剧排行榜
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { response_error_factory } from "@/utils/server";
import { CollectionTypes } from "@/constants/index";
import { parseJSONStr } from "@/utils/index";

export default async function v2(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const collections = await store.prisma.collection_v2.findMany({
    where: {
      type: {
        in: [CollectionTypes.DoubanSeasonRank, CollectionTypes.DoubanMovieRank],
      },
      user_id: member.user.id,
    },
  });
  const ranks = collections.map((col) => {
    const { id, type, title, desc, extra } = col;
    return {
      id,
      type,
      title,
      desc,
      medias: extra
        ? (() => {
            const r = parseJSONStr<{
              list: {
                id: string | null;
                name: string;
                order: number;
                poster_path: string | null;
                vote_average: number | null;
              }[];
            }>(extra);
            if (r.error) {
              return [];
            }
            const { list } = r.data;
            return list.map((media) => {
              const { id, name, order, poster_path, vote_average } = media;
              return {
                id,
                name,
                order,
                poster_path,
                vote_average,
              };
            });
          })()
        : [],
    };
  });
  return res.status(200).json({ code: 0, msg: "", data: ranks });
}
