/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { page: page_str = "1", page_size: page_size_str = "20" } = req.body as Partial<{
    name: string;
    genres: string;
    language: string;
    drive_id: string;
    season_number: string;
    invalid: string;
    duplicated: string;
    page: string;
    page_size: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id } = user;
  const page = Number(page_str);
  const page_size = Number(page_size_str);

  const where: ModelQuery<"report"> = {
    user_id,
  };
  const count = await store.prisma.report.count({ where });
  const list = await store.prisma.report.findMany({
    where,
    include: {
      member: true,
      tv: {
        include: {
          profile: true,
        },
      },
      season: {
        include: {
          profile: true,
          tv: {
            include: {
              profile: true,
            },
          },
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
      created: "desc",
    },
  });

  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
      total: count,
      list: list.map((report) => {
        const { id, type, answer, member, tv, season, episode, movie, data, created } = report;
        return {
          id,
          type,
          member: {
            id: member.id,
            name: member.remark,
          },
          data,
          tv: (() => {
            if (tv) {
              return {
                id: tv.id,
                name: tv.profile.name,
                poster_path: tv.profile.poster_path,
              };
            }
            return null;
          })(),
          season: (() => {
            if (season) {
              return {
                id: season.id,
                name: season.tv.profile.name,
                poster_path: season.profile.poster_path || season.tv.profile.poster_path,
                season_text: season.season_text,
              };
            }
            return null;
          })(),
          episode: (() => {
            if (episode) {
              return {
                id: episode.id,
                episode_text: episode.episode_text,
              };
            }
            return null;
          })(),
          movie: (() => {
            if (movie) {
              return {
                id: movie.id,
                name: movie.profile.name,
                poster_path: movie.profile.poster_path,
              };
            }
            return null;
          })(),
          answer,
          created,
        };
      }),
    },
  });
}
