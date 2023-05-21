/**
 * @file 管理后台/更新电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { get_tv_profile_with_tmdb_id } from "@/domains/walker/search_tv_in_tmdb_then_update_tv";
import { TMDBClient } from "@/domains/tmdb";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { id: tmdb_id, original_language } = req.body as Partial<{ id: number; original_language: string }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  if (!tmdb_id) {
    return e("缺少电视剧详情 id");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
      user_id,
    },
  });
  if (tv === null) {
    return e("没有匹配的电视剧记录");
  }

  const client = new TMDBClient({
    token: process.env.TMDB_TOKEN,
  });
  const tv_profile_res = await get_tv_profile_with_tmdb_id(
    {
      tmdb_id,
      original_language,
    },
    {
      client,
      store,
      need_upload_image: true,
    }
  );
  if (tv_profile_res.error) {
    return e(tv_profile_res);
  }
  const profile = tv_profile_res.data;

  await store.prisma.parsed_episode.updateMany({
    where: {
      episode: {
        tv_id: id,
      },
    },
    data: {
      episode_id: null,
      can_search: 1,
    },
  });
  await store.prisma.parsed_season.updateMany({
    where: {
      season: {
        tv_id: id,
      },
    },
    data: {
      season_id: null,
      can_search: 1,
    },
  });
  await store.prisma.parsed_tv.updateMany({
    where: {
      tv_id: id,
    },
    data: {
      tv_id: null,
      can_search: 1,
      correct_name: profile.name,
    },
  });
  await store.prisma.tv.delete({
    where: {
      id,
    },
  });

  res.status(200).json({
    code: 0,
    msg: "",
    data: tv,
  });
}
