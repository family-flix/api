/**
 * @file 获取电视剧季部分信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { normalize_partial_tv } from "@/domains/tv/utils";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { season_to_chinese_num } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { season_id } = req.query as Partial<{ season_id: string }>;

  if (!season_id) {
    return e(Result.Err("缺少季 id"));
  }

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const season = await store.prisma.season.findFirst({
    where: {
      id: season_id,
      user_id: user.id,
    },
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
    },
  });
  if (season === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const { id, season_text, profile, tv, sync_tasks, _count } = season;
  const { air_date, episode_count } = profile;
  const incomplete = episode_count !== 0 && episode_count !== _count.episodes;
  const { name, original_name, overview, poster_path, popularity, need_bind, binds, valid_bind, sync_task } =
    normalize_partial_tv({
      ...tv,
      sync_tasks,
    });
  const tips: string[] = [];
  if (binds.length !== 0 && valid_bind === null && tv.profile.in_production) {
    tips.push("更新已失效");
  }
  if (tv.profile.in_production && incomplete && binds.length === 0) {
    tips.push("未完结但缺少同步任务");
  }
  if (!tv.profile.in_production && incomplete) {
    tips.push(`已完结但集数不完整，总集数 ${episode_count}，当前集数 ${_count.episodes}`);
  }
  const data = {
    id,
    tv_id: tv.id,
    name,
    original_name,
    overview,
    season_number: season_text,
    season_text: season_to_chinese_num(season_text),
    poster_path: profile.poster_path || poster_path,
    first_air_date: air_date,
    popularity,
    cur_episode_count: _count.episodes,
    episode_count,
    incomplete,
    need_bind,
    sync_task,
    tips,
  };
  res.status(200).json({ code: 0, msg: "", data });
}
