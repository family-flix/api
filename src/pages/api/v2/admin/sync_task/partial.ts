/**
 * @file 管理后台/获取同步任务基础信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_sync_task_partial(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少同步任务 id"));
  }
  const task = await store.prisma.resource_sync_task.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      media: {
        include: {
          _count: true,
          profile: true,
        },
      },
      drive: true,
    },
  });
  if (!task) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { file_id, name, invalid, file_id_link_resource, file_name_link_resource, url, media, drive } = task;
  const data = {
    id,
    resource_file_id: file_id,
    resource_file_name: name,
    drive_file_id: file_id_link_resource,
    drive_file_name: file_name_link_resource,
    url,
    invalid,
    season: (() => {
      if (!media) {
        return null;
      }
      return {
        id: media.id,
        name: media.profile.name,
        overview: media.profile.overview,
        air_date: media.profile.air_date,
        poster_path: media.profile.poster_path,
        cur_episode_count: media._count.media_sources,
        episode_count: media.profile.source_count,
      };
    })(),
    drive: {
      id: drive.id,
      name: drive.name,
      avatar: drive.avatar,
    },
  };
  return res.status(200).json({ code: 0, msg: "", data });
}
