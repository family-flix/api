/**
 * @file 文件夹与分享资源的同步关系列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { ModelQuery } from "@/domains/store/types";
import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { ResourceSyncTaskStatus } from "@/constants";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    status,
    invalid = 0,
    next_marker,
    page_size = 20,
  } = req.body as Partial<{
    name: string;
    status: ResourceSyncTaskStatus;
    invalid: number;
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const queries: NonNullable<ModelQuery<"resource_sync_task">>[] = [
    {
      OR: [
        {
          status: ResourceSyncTaskStatus.WaitSetProfile,
        },
        {
          status: ResourceSyncTaskStatus.WorkInProgress,
        },
      ],
      invalid,
    },
  ];
  if (name) {
    queries.push({
      OR: [
        {
          name: {
            contains: name,
          },
        },
        {
          file_name_link_resource: {
            contains: name,
          },
        },
      ],
    });
  }
  const where: ModelQuery<"resource_sync_task"> = {
    user_id: user.id,
  };
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.resource_sync_task.count({
    where,
  });
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.resource_sync_task.findMany({
        where,
        include: {
          media: {
            include: {
              _count: true,
              profile: true,
            },
          },
          drive: true,
        },
        orderBy: {
          created: "desc",
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  const data = {
    total: count,
    page_size,
    next_marker: result.next_marker,
    list: result.list.map((task) => {
      const { id, file_id, name, invalid, file_id_link_resource, file_name_link_resource, url, media, drive } = task;
      return {
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
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
