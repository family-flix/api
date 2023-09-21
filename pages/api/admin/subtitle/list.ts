/**
 * @file 获取 字幕 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { TVProfileWhereInput } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    page: page_str,
    page_size: page_size_str,
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id } = user;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  let queries: TVProfileWhereInput[] = [{}];
  if (name) {
    queries = queries.concat({
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
      ],
    });
  }
  const where: NonNullable<Parameters<typeof store.prisma.season.findMany>[0]>["where"] = {
    user_id,
  };
  where.episodes = {
    some: {
      subtitles: {
        some: {},
      },
    },
  };
  if (queries.length !== 0) {
    where.tv = {
      profile: {
        AND: queries,
      },
    };
  }
  const count = await store.prisma.season.count({
    where,
  });
  const list = await store.prisma.season.findMany({
    where,
    include: {
      profile: true,
      tv: {
        include: {
          profile: true,
        },
      },
      episodes: {
        include: {
          subtitles: true,
        },
        orderBy: {
          episode_number: "asc",
        },
      },
    },
    orderBy: {
      profile: { air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
    list: list.map((season) => {
      const {
        id,
        tv: { id: tv_id, profile },
        episodes,
      } = season;
      return {
        id,
        tv_id,
        name: profile.name,
        season_text: season.season_text,
        poster_path: season.profile.poster_path || profile.poster_path,
        episodes: episodes.map((episode) => {
          const { id, episode_text, subtitles } = episode;
          return {
            id,
            episode_text,
            subtitles: subtitles.map((subtitle) => {
              const { id, file_id, language, drive_id } = subtitle;
              return {
                id,
                file_id,
                language,
                drive: {
                  id: drive_id,
                },
              };
            }),
          };
        }),
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
