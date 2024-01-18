/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { person_id: id } = req.query as Partial<{ person_id: string }>;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const profile = await store.prisma.person_profile.findFirst({
    where: {
      id,
    },
    include: {
      persons_in_media: {},
    },
  });
  if (!profile) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { name, profile_path, persons_in_media } = profile;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id,
      name,
      avatar: profile_path,
      // seasons: seasons.map((season_profile) => {
      //   const { name, season_number } = season_profile;
      //   const { seasons } = season_profile;
      //   return seasons
      //     .map((season) => {
      //       const {
      //         id,
      //         tv: { profile },
      //       } = season;
      //       return {
      //         id,
      //         name: profile.name,
      //         season_number,
      //       };
      //     })
      //     .reduce((prev, cur) => {
      //       return prev.concat(cur);
      //     }, [] as { id: string; name: string | null; season_number: number | null }[]);
      // }),
    },
  });
}
