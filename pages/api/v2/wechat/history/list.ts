/**
 * @file 获取指定用户播放历史
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { Member } from "@/domains/user/member";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp, Result } from "@/types";
import { MediaTypes } from "@/constants";
import { store } from "@/store";
import { response_error_factory } from "@/utils/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { next_marker, page_size } = req.body as Partial<{
    episode_id: string;
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const where: ModelQuery<"play_history_v2"> = {
    member_id: member.id,
  };
  const count = await store.prisma.play_history_v2.count({
    where,
  });
  const data = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.play_history_v2.findMany({
        where,
        include: {
          media: {
            include: {
              profile: true,
              _count: true,
              media_sources: {
                take: 1,
                orderBy: {
                  created: "desc",
                },
              },
            },
          },
          media_source: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          updated: "desc",
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      list: data.list
        .map((history) => {
          const { id, media, media_source, current_time, duration, updated, thumbnail_path } = history;
          if (media.type === MediaTypes.Season) {
            const { name, original_name, poster_path, air_date, source_count } = media.profile;
            const latest_episode = media.media_sources[0];
            const has_update = latest_episode && dayjs(latest_episode.created).isAfter(updated);
            return {
              id,
              type: media.type,
              media_id: media.id,
              name: name || original_name,
              poster_path: poster_path,
              cur_episode_number: media_source.profile.order,
              cur_episode_count: media._count.media_sources,
              episode_count: source_count,
              current_time,
              duration,
              thumbnail_path,
              has_update,
              air_date,
              updated,
            };
          }
          if (media.type === MediaTypes.Movie) {
            const { name, poster_path, original_name, air_date } = media.profile;
            return {
              id,
              type: media.type,
              media_id: media.id,
              name: name || original_name,
              poster_path,
              current_time,
              cur_episode_number: 0,
              cur_episode_count: 0,
              episode_count: 0,
              duration,
              thumbnail_path,
              has_update: false,
              air_date,
              updated,
            };
          }
          return null;
        })
        .filter(Boolean),
      total: count,
      page_size,
      next_marker: data.next_marker,
    },
  });
}
