/**
 * @file 获取待归档的季列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { normalize_partial_tv } from "@/domains/tv/utils";
import { ModelParam, ModelQuery, SeasonProfileWhereInput, TVProfileWhereInput } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { to_number } from "@/utils/primitive";
import { store } from "@/store";
import { MediaProfileSourceTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    drive_ids,
    page: page_str,
    page_size: page_size_str,
    next_marker = "",
  } = req.query as Partial<{
    name: string;
    drive_ids: string;
    page: string;
    page_size: string;
    next_marker: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  let queries: SeasonProfileWhereInput[] = [
    {
      source: {
        // 不是「其他」季
        not: MediaProfileSourceTypes.Other,
      },
    },
  ];
  const where: ModelQuery<"season"> = {
    episodes: {
      every: {
        parsed_episodes: {
          some: {},
        },
      },
    },
    user_id: user.id,
  };
  if (drive_ids) {
    where.parsed_seasons = {
      every: {
        drive_id: {
          in: drive_ids.split("|"),
        },
      },
    };
  }
  if (name) {
    where.tv = {
      profile: {
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
      },
    };
  }
  if (queries.length !== 0) {
    where.profile = {
      AND: queries,
    };
  }
  const count = await store.prisma.season.count({
    where,
  });
  const list = await store.prisma.season.findMany({
    where,
    include: {
      _count: true,
      profile: true,
      sync_tasks: true,
      tv: {
        include: {
          _count: true,
          profile: true,
          parsed_tvs: true,
        },
      },
      episodes: {
        include: {
          profile: true,
          _count: true,
          parsed_episodes: {
            include: {
              drive: true,
            },
          },
        },
        orderBy: {
          episode_number: "asc",
        },
      },
    },
    orderBy: {
      profile: { air_date: "asc" },
    },
    // skip: (page - 1) * page_size,
    take: page_size + 1,
    ...(() => {
      const cursor: { id?: string } = {};
      if (next_marker) {
        cursor.id = next_marker;
        return {
          cursor,
        };
      }
      return {} as ModelParam<typeof store.prisma.season.findMany>["cursor"];
    })(),
  });
  const no_more = list.length < page_size + 1;
  let new_next_marker = "";
  if (list.length === page_size + 1) {
    const last_record = list[list.length - 1];
    new_next_marker = last_record.id;
  }
  const correct_list = list.slice(0, page_size);
  const data = {
    total: count,
    list: correct_list.map((season) => {
      const { id, season_text, profile, tv, sync_tasks, episodes, _count } = season;
      const { air_date, episode_count } = profile;
      const { name, original_name, poster_path } = normalize_partial_tv({
        ...tv,
        sync_tasks,
      });
      return {
        id,
        tv_id: tv.id,
        name: name || original_name,
        original_name,
        season_text,
        poster_path: profile.poster_path || poster_path,
        first_air_date: air_date,
        cur_episode_count: _count.episodes,
        episode_count,
        episodes: episodes.map((episode) => {
          const { id, season_text, episode_text, parsed_episodes } = episode;
          const sources = parsed_episodes.map((source) => {
            const { id, file_id, file_name, parent_paths, size, drive } = source;
            return {
              id,
              file_id,
              file_name,
              parent_paths,
              size,
              drive: {
                id: drive.id,
                name: drive.name,
                type: drive.type,
              },
            };
          });
          return {
            id,
            name: episode.profile.name,
            season_text,
            episode_text,
            episode_number: episode.episode_number,
            sources,
          };
        }),
      };
    }),
    page,
    page_size,
    // no_more: list.length + (page - 1) * page_size >= count,
    no_more,
    next_marker: new_next_marker,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
