/**
 * @file 获取电视剧季部分信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { ResourceSyncTaskStatus } from "@/constants";

export default async function v2_admin_season_partial(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id } = req.body as Partial<{ media_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少季 id"));
  }
  const media = await store.prisma.media.findFirst({
    where: {
      id: media_id,
      user_id: user.id,
    },
    include: {
      _count: true,
      profile: {
        include: {
          origin_country: true,
          genres: true,
        },
      },
      media_sources: true,
      resource_sync_tasks: {
        where: {
          invalid: 0,
          status: ResourceSyncTaskStatus.WorkInProgress,
        },
        take: 10,
      },
    },
  });
  if (media === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const { id, profile, _count, media_sources, resource_sync_tasks } = media;
  const tips: string[] = [];
  if (_count.media_sources === 0) {
    tips.push("关联的剧集数为 0");
  }
  if (!profile.in_production && _count.media_sources !== profile.source_count) {
    tips.push(`已完结但集数不完整，总集数 ${profile.source_count}，当前集数 ${_count.media_sources}`);
  }
  if (profile.in_production && _count.media_sources !== profile.source_count && resource_sync_tasks.length === 0) {
    tips.push("未完结但缺少同步任务");
  }
  const { name, original_name, overview, air_date, poster_path, source_count, vote_average, origin_country, genres } =
    profile;
  const data = {
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
    tips,
  };
  return res.status(200).json({ code: 0, msg: "", data });
}
