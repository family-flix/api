/**
 * @file 获取未识别的剧集
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { query } = req;
  const { page: page_str = "1", page_size: page_size_str = "20" } = query as Partial<{
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);

  const where: ModelQuery<"parsed_episode"> = {
    episode_id: null,
    user_id,
  };
  const list = await store.prisma.parsed_episode.findMany({
    where,
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
      drive: true,
    },
    orderBy: {
      created: "desc",
    },
    take: page_size,
    skip: (page - 1) * page_size,
  });
  const count = await store.prisma.parsed_episode.count({ where });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      total: count,
      no_more: list.length + (page - 1) * page_size >= count,
      list: list.map((parsed_episode) => {
        const { id, file_id, file_name, parent_paths, season_number, episode_number, parsed_tv, drive } =
          parsed_episode;
        return {
          id,
          name: (() => {
            if (parsed_tv?.tv?.profile) {
              return parsed_tv.tv.profile.name || parsed_tv.tv.profile.original_name;
            }
            return parsed_tv.name || parsed_tv.original_name;
          })(),
          season_number,
          episode_number,
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
    },
  });
}
