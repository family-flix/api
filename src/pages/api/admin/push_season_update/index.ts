/**
 * @file 推送电视剧有更新
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;

  const members = await store.prisma.member.findMany({
    where: {
      user_id: user.id,
      disabled: 0,
    },
  });
  if (members.length === 0) {
    return e(Result.Err("没有成员需要推送"));
  }
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i];
    const histories = await store.prisma.play_history.findMany({
      where: {
        tv_id: {
          not: null,
        },
        // tv: {
        //   profile: {
        //     in_production: 1,
        //   },
        // },
        member_id: member.id,
      },
      include: {
        episode: {
          include: {
            season: {
              include: {
                _count: true,
                profile: true,
                episodes: {
                  //   take: 1,
                  orderBy: {
                    episode_number: "desc",
                  },
                },
              },
            },
            tv: {
              include: {
                profile: true,
              },
            },
            profile: true,
          },
        },
      },
    });
    for (let j = 0; j < histories.length; j += 1) {
      const { episode, updated } = histories[j];
      await (async () => {
        if (!episode) {
          return;
        }
        const { tv, season } = episode;
        const latest_episode = season.episodes[0];
        const has_update = latest_episode && dayjs(latest_episode.created).isAfter(updated);
        // console.log(tv.profile.name, latest_episode.episode_text, latest_episode.created, updated, has_update);
        if (!has_update) {
          return;
        }
        const unique_id = [tv.id, latest_episode.id, member.id].join("/");
        const existing = await store.prisma.member_notification.findFirst({
          where: {
            unique_id,
            member_id: member.id,
          },
        });
        if (existing) {
          return;
        }
        const msg = `电视剧「${tv.profile.name}」更新至 ${latest_episode.episode_number}`;
        await store.prisma.member_notification.create({
          data: {
            id: r_id(),
            unique_id,
            content: JSON.stringify({
              season: {
                id: season.id,
                tv_id: tv.id,
                name: tv.profile.name,
                poster_path: season.profile.poster_path || tv.profile.poster_path,
              },
              msg,
            }),
            type: 1,
            status: 1,
            is_delete: 0,
            member_id: member.id,
          },
        });
      })();
    }
  }

  res.status(200).json({ code: 0, msg: "", data: null });
}
