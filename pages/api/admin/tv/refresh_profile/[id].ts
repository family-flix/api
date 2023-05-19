/**
 * @file 管理后台/刷新从 TMDB 搜索到的电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { TMDBClient } from "@/domains/tmdb";
import { TVProfileFromTMDB } from "@/domains/tmdb/services";
import { TVProfileRecord } from "@/store/types";

function need_update_profile(existing_profile: TVProfileRecord, cur: TVProfileFromTMDB) {
  const { name, overview, poster_path, popularity, number_of_episodes, number_of_seasons } = cur;
  const body: Partial<{
    season_count: number;
    episode_count: number;
    popularity: number;
  }> = {};
  if (number_of_episodes !== null && number_of_episodes !== existing_profile.episode_count) {
    body.episode_count = number_of_episodes;
  }
  if (number_of_seasons !== null && number_of_seasons !== existing_profile.season_count) {
    body.season_count = number_of_seasons;
  }
  if (popularity !== null && popularity !== existing_profile.popularity) {
    body.popularity = popularity;
  }
  if (Object.keys(body).length === 0) {
    return null;
  }
  return body;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少电视剧 id");
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
    include: {
      profile: true,
    },
  });
  if (tv === null) {
    return e("没有匹配的电视剧记录");
  }
  const {
    profile: { tmdb_id },
  } = tv;
  const client = new TMDBClient({
    token: process.env.TMDB_TOKEN,
  });
  const r = await client.fetch_tv_profile(tmdb_id);
  if (r.error) {
    return e(r);
  }
  const update_payload = need_update_profile(tv.profile, r.data);
  if (update_payload === null) {
    res.status(200).json({
      code: 0,
      msg: "",
      data: null,
    });
    return;
  }
  const r2 = await store.prisma.tv_profile.update({
    where: {
      id: tv.profile.id,
    },
    data: update_payload,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: null,
  });
}
