/**
 * @file 获取指定用户播放历史
 * sqlite3 数据库，现在有 history 表，和 media 表是 一对多。media 和 media_source 是一对多。media 和 media_profile 是一对一，media_source 和 media_source_profile 是一对一。现在，需要找出符合条件的 history 记录。条件是,history 记录的更新时间 updated，小于其关联的 media 记录所关联的最新的 media_source 记录关联的 media_source_profile 记录的 air_date，air_date 是字符串。请实现 sql
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { store } from "@/store";
import { Member } from "@/domains/user/member";
import { ModelQuery } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types";
import { MediaTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { next_marker = "", page_size } = req.body as Partial<{
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
    media: {
      type: MediaTypes.Season,
    },
    member_id: member.id,
  };
  const count = await store.prisma.play_history_v2.count({
    where,
  });
  async function fetch(next_marker: string): Promise<{ list: {}[] }> {
    const result = await store.list_with_cursor({
      fetch: (args) => {
        return store.prisma.play_history_v2.findMany({
          where,
          include: {
            media: {
              include: {
                profile: true,
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
    const list = result.list
      .map((history) => {
        const { id, media, media_source, current_time, duration, updated, thumbnail_path } = history;
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
          episode_count: source_count,
          current_time,
          duration,
          thumbnail_path,
          has_update,
          air_date,
          updated,
        };
      })
      .filter((history) => {
        return history.has_update;
      });
    if (list.length === 0 && result.next_marker) {
      return fetch(result.next_marker);
    }
    const data = {
      list,
      total: count,
      page_size,
      next_marker: result.next_marker,
    };
    return data;
  }
  const data = await fetch(next_marker);
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
