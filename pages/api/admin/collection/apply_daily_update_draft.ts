/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { CollectionTypes } from "@/constants";
import { r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;

  const draft = await store.prisma.collection.findFirst({
    where: {
      type: CollectionTypes.DailyUpdateDraft,
      user_id: user.id,
    },
    include: {
      seasons: true,
      movies: true,
    },
  });
  if (!draft) {
    return e(Result.Err("没有草稿"));
  }
  const daily = await store.prisma.collection.findFirst({
    where: {
      type: CollectionTypes.DailyUpdate,
      user_id: user.id,
    },
  });
  if (!daily) {
    await store.prisma.collection.create({
      data: {
        id: r_id(),
        title: draft.title,
        type: CollectionTypes.DailyUpdate,
        medias: draft.medias,
        seasons: {
          connect: draft.seasons.map((season) => {
            return {
              id: season.id,
            };
          }),
        },
        movies: {
          connect: draft.movies.map((movie) => {
            return {
              id: movie.id,
            };
          }),
        },
        user_id: user.id,
      },
    });
    res.status(200).json({ code: 0, msg: "", data: null });
  }
  await store.prisma.collection.update({
    where: {
      id: daily?.id,
    },
    data: {
      title: draft.title,
      type: CollectionTypes.DailyUpdate,
      medias: draft.medias,
      seasons: {
        set: draft.seasons.map((season) => {
          return {
            id: season.id,
          };
        }),
      },
      movies: {
        set: draft.movies.map((movie) => {
          return {
            id: movie.id,
          };
        }),
      },
      user_id: user.id,
    },
  });
  res.status(200).json({ code: 0, msg: "", data: null });
}
