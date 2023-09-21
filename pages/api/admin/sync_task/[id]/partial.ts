/**
 * @file 管理后台/更新同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

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
    return e(Result.Err("缺少同步任务 id"));
  }
  const task = await store.prisma.bind_for_parsed_tv.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      season: {
        include: {
          _count: true,
          profile: true,
          tv: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });
  if (!task) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { file_id, name, file_id_link_resource, file_name_link_resource, url, season, drive_id } = task;
  const data = {
    id,
    resource_file_id: file_id,
    resource_file_name: name,
    drive_file_id: file_id_link_resource,
    drive_file_name: file_name_link_resource,
    url,
    season: (() => {
      if (!season) {
        return null;
      }
      const { name, overview, poster_path } = season.tv.profile;
      return {
        id: season.id,
        tv_id: season.tv.id,
        name,
        overview,
        air_date: season.profile.air_date,
        poster_path: season.profile.poster_path || poster_path,
        cur_episode_count: season._count.episodes,
        episode_count: season.profile.episode_count,
      };
    })(),
    drive: {
      id: drive_id,
    },
  };
  res.status(200).json({ code: 0, msg: "", data });
}
