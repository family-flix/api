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

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const seasons = await store.prisma.season.findMany({
    where: {
      user_id: user.id,
    },
    include: {
      profile: true,
      episodes: {
        take: 1,
        orderBy: {
          episode_number: "desc",
        },
      },
      tv: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: [
      {
        created: "desc",
      },
    ],
  });
  const movies = await store.prisma.movie.findMany({
    where: {
      user_id: user.id,
      created: {
        lt: dayjs().endOf("day").toISOString(),
        gte: dayjs().startOf("day").toISOString(),
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
  });
  type MediaPayload = {
    id: string;
    tv_id?: string;
    name: string;
    poster_path: string;
    text: string | null;
  };
  const medias = seasons
    .map((season) => {
      const { id, tv, profile, episodes } = season;
      return {
        id,
        type: 1,
        tv_id: tv.id,
        name: tv.profile.name,
        poster_path: profile.poster_path || tv.profile.poster_path,
        text: episodes.length ? `更新至 ${episodes[0].episode_number} 集` : null,
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
          text: null,
        } as MediaPayload;
      })
    );
  res.status(200).json({
    code: 0,
    msg: "",
    data: medias,
  });
}
