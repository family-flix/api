/**
 * @file 获取指定电视剧所有季
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id } = t_res.data;
  const seasons = await store.prisma.season.findMany({
    where: {
      tv_id: id,
    },
    include: {
      profile: true,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      list: seasons.map((season) => {
        const { id, profile, season_number } = season;
        const { name, overview, poster_path } = profile;
        return {
          id,
          name,
          overview,
          poster_path,
          season_number,
        };
      }),
    },
  });
}
