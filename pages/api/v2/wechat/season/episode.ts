/**
 * @file 根据范围获取剧集列表
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { MediaTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id, start, end } = req.body as Partial<{ media_id: string; start: number; end: number }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少电视剧季 id"));
  }
  if (start === undefined || end === undefined) {
    return e(Result.Err("缺少剧集范围参数"));
  }
  const season = await store.prisma.media.findFirst({
    where: {
      id: media_id,
      type: MediaTypes.Season,
      user_id: member.user.id,
    },
    include: {
      profile: true,
    },
  });
  if (season === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const episodes = await store.prisma.media_source.findMany({
    where: {
      media_id: season.id,
    },
    include: {
      profile: true,
      files: {
        include: { drive: true },
      },
    },
    skip: start - 1,
    take: end - start + 1,
    orderBy: {
      profile: {
        order: "asc",
      },
    },
  });
  const data = {
    list: episodes.map((episode) => {
      const { id, profile, files } = episode;
      const { name, overview, order, runtime } = profile;
      return {
        id,
        name,
        overview,
        order,
        runtime,
        season_id: media_id,
        sources: files.map((parsed_episode) => {
          const { id, file_id, file_name, parent_paths } = parsed_episode;
          return {
            id,
            file_id,
            file_name,
            parent_paths,
          };
        }),
      };
    }),
  };
  res.status(200).json({ code: 0, msg: "", data });
}
