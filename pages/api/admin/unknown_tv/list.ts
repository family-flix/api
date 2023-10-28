/**
 * @file 获取未识别，认为是电视剧的记录列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { query } = req;
  const {
    name,
    page: page_str,
    page_size: page_size_str,
  } = query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  const where: ModelQuery<"parsed_tv"> = {
    tv_id: null,
    user_id: user.id,
  };
  if (name) {
    where.OR = [
      {
        name: {
          contains: name,
        },
      },
      {
        file_name: {
          contains: name,
        },
      },
    ];
  }
  const count = await store.prisma.parsed_tv.count({ where });
  const list = await store.prisma.parsed_tv.findMany({
    where,
    include: {
      parsed_episodes: true,
      drive: true,
    },
    take: page_size,
    skip: (page - 1) * page_size,
    orderBy: {
      created: "desc",
    },
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
      total: count,
      list: list.map((parsed_tv) => {
        const { id, name, original_name, file_id, file_name, parsed_episodes, drive } = parsed_tv;
        return {
          id,
          name: name || original_name,
          file_id,
          file_name,
          parsed_seasons: [],
          parsed_episodes: parsed_episodes.map((episode) => {
            const { id, file_name, season_number, episode_number, parent_paths, episode_id } = episode;
            return {
              id,
              season_text: season_number,
              episode_text: episode_number,
              file_name,
              parent_paths,
              episode_id,
            };
          }),
          drive: {
            id: drive.id,
            name: drive.name,
          },
        };
      }),
    },
  });
}
