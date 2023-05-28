/**
 * @file 获取影片列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { Member } from "@/domains/user/member";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    tv_id,
    season_id,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    tv_id: string;
    season_id: string;
    page: string;
    page_size: string;
  }>;
  if (!tv_id) {
    return e("缺少电视剧 id");
  }
  if (!season_id) {
    return e("缺少季 id");
  }
  const t_res = await Member.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  // const { id: user_id } = member;
  const page = Number(page_str);
  const page_size = Number(page_size_str);

  const where: NonNullable<Parameters<typeof store.prisma.episode.findMany>[number]>["where"] = {
    tv_id,
    season_id,
    // user_id,
  };
  const list = await store.prisma.episode.findMany({
    where,
    include: {
      profile: true,
      parsed_episodes: true,
    },
    skip: (page - 1) * page_size,
    take: page_size,
    orderBy: {
      episode_number: "asc",
    },
  });
  const count = await store.prisma.episode.count({ where });

  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      total: count,
      no_more: list.length + (page - 1) * page_size >= count,
      list: list.map((episode) => {
        const { id, season_number, episode_number, profile, parsed_episodes, season_id } = episode;
        const { name, overview } = profile;
        return {
          id,
          name,
          overview,
          season_number,
          episode_number,
          season_id,
          sources: parsed_episodes.map((parsed_episode) => {
            const { file_id, file_name } = parsed_episode;
            return {
              id: file_id,
              file_id,
              file_name,
            };
          }),
        };
      }),
    },
  });
}
