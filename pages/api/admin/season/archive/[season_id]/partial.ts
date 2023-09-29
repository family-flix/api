/**
 * @file 获取待归档的季列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { normalize_partial_tv } from "@/domains/media_thumbnail/utils";
import { ModelQuery, SeasonProfileWhereInput } from "@/domains/store/types";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { season_id } = req.query as Partial<{
    season_id: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!season_id) {
    return e(Result.Err("缺少季 id"));
  }
  let queries: SeasonProfileWhereInput[] = [];
  const where: ModelQuery<"season"> = {
    id: season_id,
    user_id: user.id,
  };
  if (queries.length !== 0) {
    where.profile = {
      AND: queries,
    };
  }
  const season = await store.prisma.season.findFirst({
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
  });
  if (!season) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { id, season_text, profile, tv, sync_tasks, episodes, _count } = season;
  const { air_date, episode_count } = profile;
  const { name, original_name, poster_path } = normalize_partial_tv({
    ...tv,
    sync_tasks,
  });
  const data = {
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
        const { file_id, file_name, parent_paths, size, drive } = source;
        return {
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
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
