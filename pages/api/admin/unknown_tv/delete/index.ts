/**
 * @file 删除未识别的电视剧列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { query } = req;
  const {} = query as Partial<{}>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id } = user;
  // await store.prisma.bind_for_parsed_tv.deleteMany({
  //   where: {
  //     user_id,
  //   },
  // });
  await store.prisma.parsed_episode.deleteMany({
    where: {
      OR: [
        {
          parsed_tv: {
            tv_id: null,
          },
        },
        {
          parsed_season: {
            season_id: null,
          },
        },
      ],
      user_id,
    },
  });
  await store.prisma.parsed_season.deleteMany({
    where: {
      parsed_tv: {
        tv_id: null,
      },
      user_id,
    },
  });
  await store.prisma.parsed_tv.deleteMany({
    where: {
      tv_id: null,
      user_id,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
