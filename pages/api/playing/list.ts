/**
 * @file 获取指定用户播放历史
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Member } from "@/domains/user/member";
import dayjs from "dayjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { page: page_str = "1", page_size: page_size_str = "20" } = req.query as Partial<{
    episode_id: string;
    page: string;
    page_size: string;
  }>;

  const t_res = await Member.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.play_history.findMany>[0]>["where"] = {
    member_id,
  };
  const list = await store.prisma.play_history.findMany({
    where,
    include: {
      tv: {
        include: {
          profile: true,
          episodes: {
            take: 1,
            orderBy: {
              created: "desc",
            },
          },
        },
      },
      episode: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: {
      updated: "desc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const count = await store.prisma.play_history.count({
    where,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      list: list.map((history) => {
        const { tv, episode, current_time, duration, updated } = history;
        if (tv && episode) {
          const { name, original_name } = tv.profile;
          const profile = episode.profile;
          const latest_episode = tv.episodes[0];
          const has_update = latest_episode && dayjs(latest_episode.created).isAfter(updated);
          return {
            tv_id: tv.id,
            tv_name: name || original_name,
            episode_name: profile.name,
            current_time,
            duration,
            has_update,
          };
        }
      }),
      total: count,
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size <= count,
    },
  });
}
