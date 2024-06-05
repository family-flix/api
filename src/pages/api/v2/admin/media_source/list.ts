/**
 * @file 获取指定电视剧的剧集列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { response_error_factory } from "@/utils/server";
import { Result } from "@/types/index";

export default async function v2_admin_media_source_list(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const {
    name,
    media_id,
    page_size = 20,
  } = req.body as Partial<{
    name: string;
    media_id: string;
    page_size: number;
  }>;
  const { authorization } = req.headers;
  if (!media_id) {
    return e(Result.Err("缺少季 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  // store.prisma.media_source.findMany({
  //   where: {
  //     media_id: '',
  //   }
  // });
  const where: NonNullable<Parameters<typeof store.prisma.media_source.findMany>[0]>["where"] = {
    media_id,
    user_id,
  };
  const count = await store.prisma.media_source.count({
    where,
  });
  const result = await store.list_with_cursor({
    fetch(extra) {
      return store.prisma.media_source.findMany({
        where,
        include: {
          profile: true,
          files: {
            include: {
              drive: true,
            },
          },
        },
        orderBy: {
          profile: {
            order: "asc",
          },
        },
        ...extra,
      });
    },
    page_size,
  });
  const data = {
    total: count,
    next_marker: result.next_marker,
    list: result.list.map((episode) => {
      const { id, profile, files } = episode;
      return {
        id,
        name: profile.name,
        overview: profile.overview,
        first_air_date: profile.air_date,
        runtime: profile.runtime,
        episode_number: profile.order,
        sources: files.map((parsed_episode) => {
          const { id, file_id, file_name, parent_paths, size, drive } = parsed_episode;
          return {
            id,
            file_id,
            file_name,
            parent_paths,
            size,
            drive: {
              id: drive.id,
              name: drive.name,
              avatar: drive.avatar,
            },
          };
        }),
      };
    }),
  };
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
