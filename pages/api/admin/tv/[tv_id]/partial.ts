/**
 * @file 删除播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";
import { store } from "@/store";
import { normalize_partial_tv } from "@/domains/tv/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { tv_id } = req.query as Partial<{ tv_id: string }>;

  if (!tv_id) {
    return e(Result.Err("缺少电视剧 id"));
  }

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const tv = await store.prisma.tv.findFirst({
    where: {
      id: tv_id,
      user_id: user.id,
    },
    include: {
      _count: true,
      profile: true,
      parsed_tvs: {
        include: {
          binds: {
            orderBy: {
              created: "desc",
            },
          },
        },
      },
      episodes: {
        include: {
          profile: true,
          _count: true,
          parsed_episodes: true,
        },
        orderBy: {
          episode_number: "desc",
        },
      },
    },
  });
  if (tv === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const normalized = normalize_partial_tv(tv);
  res.status(200).json({ code: 0, msg: "", data: normalized });
}
