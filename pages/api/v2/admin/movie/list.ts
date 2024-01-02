/**
 * @file 获取电影列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";
import { MediaTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    next_marker = "",
    page_size: page_size_str,
  } = req.query as Partial<{
    name: string;
    next_marker: string;
    page_size: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page_size = to_number(page_size_str, 20);
  const where: ModelQuery<"media"> = {
    type: MediaTypes.Movie,
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
              genres: true,
              origin_country: true,
            },
          },
          media_sources: {
            include: {
              _count: true,
              profile: true,
            },
          },
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
        const { name, original_name, overview, air_date, poster_path, vote_average, origin_country, genres } = profile;
        const source_count = media_sources.reduce((count, cur) => {
          return count + cur._count.files;
        }, 0);
        const tips: string[] = [];
        if (source_count === 0) {
          tips.push("没有可播放的视频源");
        }
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
            const { id, text } = genre;
            return {
              value: id,
              label: text,
            };
          }),
          runtime: (() => {
            if (media_sources.length === 0) {
              return null;
            }
            const { runtime } = media_sources[0].profile;
            return runtime;
          })(),
          tips,
          persons: [],
        };
      }),
    },
  });
}
