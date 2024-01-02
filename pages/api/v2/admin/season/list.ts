/**
 * @file 获取季列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { MediaTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    next_marker = "",
    page_size,
  } = req.body as Partial<{
    name: string;
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: ModelQuery<"media"> = {
    type: MediaTypes.Season,
    user_id: user.id,
  };
  if (name) {
    where.profile = {
      OR: [
        {
          name: {
            contains: name,
          },
        },
        {
          original_name: {
            contains: name,
          },
        },
        {
          alias: {
            contains: name,
          },
        },
      ],
    };
  }
  const count = await store.prisma.media.count({ where });
  const data = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.media.findMany({
        where,
        include: {
          profile: {
            include: {
              origin_country: true,
              genres: true,
            },
          },
          media_sources: true,
        },
        orderBy: {
          profile: {
            air_date: "desc",
          },
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
      ...data,
      total: count,
      list: data.list.map((media) => {
        const { id, profile, media_sources } = media;
        const {
          name,
          original_name,
          overview,
          air_date,
          poster_path,
          source_count,
          vote_average,
          origin_country,
          genres,
        } = profile;
        return {
          id,
          name,
          original_name,
          overview,
          air_date,
          poster_path,
          vote_average,
          origin_country: origin_country.map((country) => country.id),
          genres: genres.map((genre) => {
            return {
              value: genre.id,
              label: genre.id,
            };
          }),
          episode_count: source_count,
          cur_episode_count: media_sources.length,
          tips: [],
        };
      }),
    },
  });
}
