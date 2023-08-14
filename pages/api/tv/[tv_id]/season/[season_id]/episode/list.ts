/**
 * @file 获取指定电视剧、季下的影片列表
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
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);

  const where: NonNullable<Parameters<typeof store.prisma.episode.findMany>[number]>["where"] = {
    tv_id,
    user_id: member.user.id,
  };
  if (season_id) {
    where.season_id = season_id;
  }
  const list = await store.prisma.episode.findMany({
    where,
    include: {
      profile: true,
      parsed_episodes: {
        include: {
          drive: true,
        },
      },
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
        const { name, overview, runtime } = profile;
        return {
          id,
          name,
          overview,
          season_number,
          episode_number,
          season_id,
          runtime,
          sources: parsed_episodes.map((parsed_episode) => {
            const { file_id, file_name, parent_paths, drive } = parsed_episode;
            return {
              id: file_id,
              file_id,
              file_name,
              parent_paths,
              drive: {
                id: drive.id,
                name: drive.name,
                avatar: drive.avatar,
              },
            };
          }),
        };
      }),
    },
  });
}