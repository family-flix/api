/**
 * @file 获取推荐
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { MediaProfileSourceTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { start, end } = req.query as Partial<{ start: string; end: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
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
      user_id: user.id,
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
    orderBy: [
      {
        episode_number: "desc",
      },
      {
        season: {
          profile: {
            air_date: "desc",
          },
        },
      },
    ],
  });
  const movies = await store.prisma.movie.findMany({
    where: {
      user_id: user.id,
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
        profile: {
          air_date: "desc",
        },
      },
    ],
  });
  type MediaPayload = {
    id: string;
    tv_id?: string;
    season_text?: string;
    name: string;
    poster_path: string;
    text: string | null;
    air_date: string;
  };
  const medias = episodes
    .map((episode) => {
      const { id, tv, season } = episode;
      return {
        id,
        type: 1,
        tv_id: tv.id,
        name: tv.profile.name,
        season_text: season.season_text,
        poster_path: season.profile.poster_path || tv.profile.poster_path,
        air_date: season.profile.air_date,
        text: (() => {
          if (season.profile.episode_count === episode.episode_number) {
            return `全 ${season.profile.episode_count} 集`;
          }
          return `更新至 ${episode.episode_number} 集`;
        })(),
      } as MediaPayload;
    })
    .concat(
      movies.map((movie) => {
        const { id, profile } = movie;
        return {
          id,
          type: 2,
          name: profile.name,
          poster_path: profile.poster_path,
          air_date: profile.air_date,
          text: null,
        } as MediaPayload;
      })
    );
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      total: medias.length,
      list: medias,
    },
  });
}
