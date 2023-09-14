/**
 * @file 获取 tv 的集列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { store } from "@/store";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    tv_id,
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    tv_id: string;
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  if (!tv_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: ModelQuery<"episode"> = {
    tv_id,
    user_id: user.id,
  };
  const count = await store.prisma.episode.count({
    where,
  });
  const list = await store.prisma.episode.findMany({
    where,
    include: {
      profile: true,
    },
    orderBy: {
      episode_number: "asc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    no_more: list.length + (page - 1) * page_size >= count,
    page,
    page_size,
    list: list.map((episode) => {
      const { id, profile, episode_text } = episode;
      return {
        id,
        name: profile.name,
        overview: profile.overview,
        episode_number: episode_text,
        first_air_date: profile.air_date,
        tmdb_id: profile.unique_id,
        platform: profile.source,
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
