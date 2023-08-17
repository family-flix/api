/**
 * @file 获取指定用户播放历史
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { page: page_str = "1", page_size: page_size_str = "20" } = req.query as Partial<{
    episode_id: string;
    page: string;
    page_size: string;
  }>;

  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.play_history.findMany>[0]>["where"] = {
    tv_id: {
      not: null,
    },
    episode_id: {
      not: null,
    },
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
          _count: true,
        },
      },
      episode: {
        include: {
          season: {
            include: {
              profile: true,
              _count: true,
              episodes: {
                take: 1,
                orderBy: {
                  created: "desc",
                },
              },
            },
          },
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
      list: await Promise.all(
        list.map(async (history) => {
          const { id, tv, episode, movie, current_time, duration, updated, thumbnail, file_id } = history;
          if (tv && episode) {
            const { name, original_name } = tv.profile;
            const { poster_path, air_date, episode_count } = episode.season.profile;
            const profile = episode.profile;
            const latest_episode = episode.season.episodes[0];
            const has_update = latest_episode && dayjs(latest_episode.created).isAfter(updated);
            return {
              id,
              tv_id: tv.id,
              episode_id: episode.id,
              name: name || original_name,
              poster_path: poster_path || tv.profile.poster_path,
              episode_name: profile.name,
              episode_number: episode.episode_text,
              season_number: episode.season_text,
              current_time,
              duration,
              file_id,
              thumbnail,
              cur_episode_count: episode.season._count.episodes,
              episode_count,
              has_update,
              first_air_date: air_date,
              updated,
            };
          }
          if (movie) {
            const { name, poster_path, vote_average, original_name, air_date } = movie.profile;
            return {
              id,
              movie_id: movie.id,
              name: name || original_name,
              poster_path,
              vote_average,
              current_time,
              duration,
              file_id,
              thumbnail,
              first_air_date: air_date,
              updated,
            };
          }
        })
      ),
      total: count,
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
    },
  });
}
