/**
 * @file 获取 tv 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { store } from "@/store";
import { BaseApiResp, resultify } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { bytes_to_size } from "@/utils";
import { Member } from "@/domains/user/member";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.tv.findMany>[0]>["where"] = {
    profile: {
      OR: name
        ? [
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
          ]
        : undefined,
    },
  };
  const count = await store.prisma.tv.count({
    where,
  });
  const list = await store.prisma.tv.findMany({
    where,
    include: {
      _count: true,
      profile: true,
      episodes: {
        include: {
          profile: true,
          _count: true,
          parsed_episodes: {
            select: {
              file_id: true,
              file_name: true,
              size: true,
            },
          },
        },
        orderBy: {
          episode_number: "desc",
        },
      },
      // seasons: {
      //   include: {
      //     profile: true,
      //     parsed_season: true,
      //   },
      //   orderBy: {
      //     season_number: "desc",
      //   },
      // },
    },
    orderBy: {
      profile: { first_air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,

    list: list.map((tv) => {
      const { id, profile, _count } = tv;
      const { name, original_name, overview, poster_path, first_air_date, episode_count, season_count } = profile;
      const incomplete = episode_count !== 0 && episode_count !== _count.episodes;
      return {
        id,
        name: name || original_name,
        overview,
        poster_path,
        first_air_date,
        episode_count,
        season_count,
        cur_episode_count: _count.episodes,
        cur_season_count: _count.seasons,
        in_production: incomplete,
        // episodes: episodes.map((episode) => {
        //   const { profile, parsed_episodes } = episode;
        //   return {
        //     id: episode.id,
        //     name: profile.name,
        //     sources: parsed_episodes.map((source) => {
        //       const { file_id, file_name, size } = source;
        //       return {
        //         id: file_id,
        //         file_id,
        //         file_name,
        //         size,
        //         size_text: bytes_to_size(size ?? 0),
        //       };
        //     }),
        //   };
        // }),
        // seasons: seasons.map((s) => {
        //   const {
        //     id,
        //     profile: { name, overview, episode_count },
        //   } = s;
        //   return {
        //     id,
        //     name,
        //     overview,
        //     episode_count,
        //   };
        // }),
        // episodes: episodes.map((e) => {
        //   const {
        //     id,
        //     episode_number,
        //     profile: { name, overview },
        //     parsed_episodes,
        //   } = e;
        //   return {
        //     id,
        //     name,
        //     overview,
        //     episode_number,
        //     sources: parsed_episodes.map((source) => {
        //       const { id, file_id, file_name } = source;
        //       return {
        //         id,
        //         file_id,
        //         file_name,
        //       };
        //     }),
        //   };
        // }),
      };
    }),
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
