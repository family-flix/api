/**
 * @file 获取成员详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import dayjs from "dayjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { member_id } = req.query as Partial<{ member_id: string }>;

  if (!member_id) {
    return e(Result.Err("缺少成员 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const member = await store.prisma.member.findFirst({
    where: {
      id: member_id,
      user_id: user.id,
    },
    include: {
      play_histories: {
        include: {
          tv: {
            include: {
              profile: true,
            },
          },
          episode: {
            include: {
              profile: true,
            },
          },
          movie: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          updated: "asc",
        },
      },
    },
  });
  if (!member) {
    return e(Result.Err("没有匹配的成员"));
  }
  const { id, remark, play_histories } = member;
  const data = {
    id,
    remark,
    histories: play_histories.map((history) => {
      const { id, tv, episode, movie, current_time, duration, updated, created } = history;
      return {
        id,
        type: movie === null ? 1 : 2,
        profile: (() => {
          if (tv !== null && episode !== null) {
            return {
              name: tv.profile.name,
              poster_path: tv.profile.poster_path,
              episode_number: episode.episode_text,
              season_number: episode.season_text,
            };
          }
          if (movie !== null) {
            return {
              name: movie.profile.name,
              poster_path: movie.profile.name,
            };
          }
        })(),
        current_time,
        duration,
        created: dayjs(created).format("YYYY-MM-DD HH:mm:ss"),
        updated: dayjs(updated).format("YYYY-MM-DD HH:mm:ss"),
      };
    }),
  };

  res.status(200).json({ code: 0, msg: "", data });
}
