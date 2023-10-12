/**
 * @file 获取当天新增的影视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { MediaProfileSourceTypes, MediaTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { start, end } = req.body as Partial<{ start: string; end: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const range = [
    start ? dayjs(start).toISOString() : dayjs().startOf("day").toISOString(),
    end ? dayjs(end).toISOString() : dayjs().endOf("day").toISOString(),
  ];
  const episodes = await store.prisma.episode.findMany({
    where: {
      created: {
        gte: range[0],
        lt: range[1],
      },
      season: {
        profile: {
          source: {
            not: MediaProfileSourceTypes.Other,
          },
        },
      },
      user_id: member.user.id,
    },
    include: {
      season: {
        include: {
          profile: true,
        },
      },
      tv: {
        include: {
          profile: true,
        },
      },
    },
    distinct: ["season_id"],
    take: 20,
    orderBy: [
      {
        created: "desc",
      },
    ],
  });
  const movies = await store.prisma.movie.findMany({
    where: {
      parsed_movies: {
        some: {},
      },
      user_id: member.user.id,
      created: {
        gte: range[0],
        lt: range[1],
      },
    },
    include: {
      profile: true,
    },
    orderBy: [
      {
        created: "desc",
      },
    ],
    take: 20,
  });
  type MediaPayload = {
    id: string;
    type: MediaTypes;
    name: string;
    poster_path: string;
    air_date: string;
    tv_id?: string;
    season_text?: string;
    text: string | null;
    created: number;
  };
  const episode_medias: MediaPayload[] = [];
  const movie_media: MediaPayload[] = [];
  for (let i = 0; i < episodes.length; i += 1) {
    await (async () => {
      const episode = episodes[i];
      const { tv, season } = episode;
      const latest_episode = await store.prisma.episode.findFirst({
        where: {
          season_id: season.id,
          parsed_episodes: {
            some: {},
          },
        },
        orderBy: {
          episode_number: "desc",
        },
        take: 1,
      });
      if (!latest_episode) {
        return;
      }
      const media = {
        id: season.id,
        type: MediaTypes.Season,
        tv_id: tv.id,
        name: tv.profile.name,
        season_text: season.season_text,
        poster_path: season.profile.poster_path || tv.profile.poster_path,
        air_date: dayjs(season.profile.air_date).format("YYYY/MM/DD"),
        text: await (async () => {
          const episode_count = await store.prisma.episode.count({
            where: {
              season_id: season.id,
              parsed_episodes: {
                some: {},
              },
            },
          });
          if (season.profile.episode_count === episode_count) {
            return `全${season.profile.episode_count}集`;
          }
          if (episode_count === latest_episode.episode_number) {
            return `更新至${latest_episode.episode_number}集`;
          }
          return `收录${episode_count}集`;
        })(),
        created: dayjs(latest_episode.created).unix(),
      } as MediaPayload;
      episode_medias.push(media);
    })();
  }
  for (let i = 0; i < movies.length; i += 1) {
    await (async () => {
      const movie = movies[i];
      const { id, profile, created } = movie;
      const media = {
        id,
        type: MediaTypes.Movie,
        name: profile.name,
        poster_path: profile.poster_path,
        air_date: dayjs(profile.air_date).format("YYYY/MM/DD"),
        text: null,
        created: dayjs(created).unix(),
      } as MediaPayload;
      movie_media.push(media);
    })();
  }
  const medias = [...episode_medias, ...movie_media].sort((a, b) => {
    return b.created - a.created;
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      total: medias.length,
      list: medias,
    },
  });
}
