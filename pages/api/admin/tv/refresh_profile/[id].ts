/**
 * @file 管理后台 刷新/绑定电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { TMDBClient } from "@/domains/tmdb";
import { TVProfileFromTMDB } from "@/domains/tmdb/services";
import { TVProfileRecord } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { app, store } from "@/store";

function need_update_profile(existing_profile: TVProfileRecord, cur: TVProfileFromTMDB) {
  const { name, overview, poster_path, backdrop_path, popularity, number_of_episodes, number_of_seasons } = cur;
  const body: Partial<{
    name: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
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
  if (name !== null && name !== existing_profile.name) {
    body.name = name;
  }
  if (overview !== null && overview !== existing_profile.overview) {
    body.overview = overview;
  }
  if (poster_path !== null && poster_path !== existing_profile.poster_path) {
    body.poster_path = poster_path;
  }
  if (backdrop_path !== null && backdrop_path !== existing_profile.backdrop_path) {
    body.backdrop_path = backdrop_path;
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
  const { tmdb_id } = req.body as { tmdb_id: string };
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
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
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const client = new TMDBClient({
    token: settings.tmdb_token,
  });
  const r = await client.fetch_tv_profile(tmdb_id ? Number(tmdb_id) : tv.profile.tmdb_id);
  if (r.error) {
    return e(r.error);
  }
  const update_payload = need_update_profile(tv.profile, r.data);
  if (update_payload === null) {
    res.status(200).json({
      code: 0,
      msg: "没有要更新的内容",
      data: null,
    });
    return;
  }
  const searcher_res = await MediaSearcher.New({
    user_id: user.id,
    tmdb_token: user.settings.tmdb_token,
    assets: app.assets,
    store,
  });
  if (searcher_res.error) {
    return e(searcher_res.error);
  }
  const searcher = searcher_res.data;
  const profile = await searcher.normalize_tv_profile(
    {
      tmdb_id: tmdb_id ? Number(tmdb_id) : tv.profile.tmdb_id,
    },
    r.data
  );
  await store.prisma.tv_profile.update({
    where: {
      id: tv.profile.id,
    },
    data: update_payload,
  });
  res.status(200).json({
    code: 0,
    msg: "更新成功",
    data: profile,
  });
}
