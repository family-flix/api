/**
 * @file 获取播放源详情
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
  const { id } = req.query as Partial<{ id: string }>;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少播放源 id"));
  }
  const source = await store.prisma.parsed_episode.findFirst({
    where: {
      file_id: id,
      user_id: user.id,
    },
    include: {
      parsed_tv: {
        include: {
          tv: {
            include: {
              profile: true,
            },
          },
        },
      },
      parsed_season: true,
    },
  });
  if (!source) {
    return e(Result.Err("没有匹配的播放源"));
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: (() => {
      const { file_id, file_name, parsed_tv } = source;
      return {
        id: file_id,
        file_id,
        file_name,
        parsed_tv,
      };
    })(),
  });
}
