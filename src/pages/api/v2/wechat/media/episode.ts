/**
 * @file 根据范围获取剧集列表
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { Media } from "@/domains/media/index";
import { response_error_factory } from "@/utils/server";
import { MediaTypes } from "@/constants/index";
import { Result } from "@/types/index";

export default async function v2_wechat_media_episode(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    media_id,
    next_marker = "",
    page_size = 20,
    start,
    end,
  } = req.body as Partial<{
    media_id: string;
    next_marker: string;
    page_size: number;
    start: number;
    end: number;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const r = await Media.Get({ id: media_id, type: MediaTypes.Season, member, store });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const media = r.data;
  if (start !== undefined && end !== undefined) {
    const r2 = await media.fetch_episodes_by_range({ start, end });
    if (r2.error) {
      return e(Result.Err(r2.error.message));
    }
    const data = {
      list: r2.data,
    };
    return res.status(200).json({ code: 0, msg: "", data });
  }
  const season = media.profile;
  if (next_marker) {
    const where = {
      files: {
        some: {},
      },
      media_id: season.id,
    };
    const count = await store.prisma.media_source.count({ where });
    const result = await store.list_with_cursor({
      fetch(extra) {
        return store.prisma.media_source.findMany({
          where,
          include: {
            profile: true,
            subtitles: true,
            files: {
              include: { drive: true },
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
      next_marker,
    });
    const data = {
      total: count,
      next_marker: result.next_marker,
      list: result.list.map((episode) => {
        const { id, profile, files, subtitles } = episode;
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
    return res.status(200).json({ code: 0, msg: "", data });
  }
  return e(Result.Err("缺少参数"));
}
