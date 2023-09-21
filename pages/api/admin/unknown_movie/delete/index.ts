/**
 * @file 删除未识别的电影列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
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
  await store.prisma.parsed_movie.deleteMany({
    where: {
      AND: [
        {
          movie_id: null,
        },
        {
          correct_name: null,
        },
      ],
      user_id,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
