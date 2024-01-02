/**
 * @file 获取待归档的季列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp, Result } from "@/types";
import { MediaTypes } from "@/constants";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { media_id } = req.body as Partial<{ media_id: string }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少 id"));
  }
  let queries: NonNullable<ModelQuery<"media">>[] = [];
  const where: ModelQuery<"media"> = {
    id: media_id,
    user_id: user.id,
  };
  if (queries.length !== 0) {
    where.profile = {
      AND: queries,
    };
  }
  const media = await store.prisma.media.findFirst({
    where,
    include: {
      _count: true,
      profile: true,
      media_sources: {
        include: {
          profile: true,
          files: {
            include: {
              drive: true,
            },
          },
        },
      },
    },
    orderBy: {
      profile: { air_date: "asc" },
    },
  });
  if (!media) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { id, type, profile, media_sources, _count } = media;
  const data = {
    id,
    type,
    name: profile.name,
    poster_path: profile.poster_path,
    air_date: profile.air_date,
    cur_episode_count: type === MediaTypes.Movie ? null : _count.media_sources,
    episode_count: type === MediaTypes.Movie ? 1 : profile.source_count,
    sources: media_sources.map((source) => {
      const { id, profile, files } = source;
      return {
        id,
        name: profile.name,
        order: type === MediaTypes.Movie ? 1 : source.profile.order,
        files: files.map((file) => {
          const { id, file_id, file_name, parent_paths, size, drive } = file;
          return {
            id,
            file_id,
            file_name,
            parent_paths,
            size,
            drive: {
              id: drive.id,
              name: drive.name,
              type: drive.type,
            },
          };
        }),
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
