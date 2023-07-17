/**
 * @file 刷新/绑定电影详情
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { MediaSearcher } from "@/domains/searcher";
import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { app, store } from "@/store";
import { TMDBClient } from "@/domains/tmdb";
import { MovieProfileRecord } from "@/domains/store/types";
import { MovieProfileFromTMDB } from "@/domains/tmdb/services";

function need_update_profile(existing_profile: MovieProfileRecord, cur: MovieProfileFromTMDB) {
  const { name, overview, poster_path, backdrop_path, popularity } = cur;
  const body: Partial<{
    name: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    season_count: number;
    episode_count: number;
    popularity: number;
  }> = {};
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
  const { movie_id } = req.query as Partial<{ movie_id: string }>;
  const { tmdb_id } = req.body as { tmdb_id: string };
  if (!movie_id) {
    return e("缺少电影 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const movie = await store.prisma.movie.findFirst({
    where: {
      id: movie_id,
    },
    include: {
      profile: true,
      parsed_movies: true,
    },
  });
  if (movie === null) {
    return e("没有匹配的电影记录");
  }
  if (!tmdb_id && !movie.profile) {
    return e("该电影还没有匹配的详情");
  }
  const client = new TMDBClient({
    token: user.settings.tmdb_token,
  });
  const r = await client.fetch_movie_profile(tmdb_id ? Number(tmdb_id) : movie.profile.tmdb_id);
  if (r.error) {
    return e(r.error);
  }
  const update_payload = need_update_profile(movie.profile, r.data);
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
  const profile = await searcher.normalize_movie_profile(
    {
      tmdb_id: tmdb_id ? Number(tmdb_id) : movie.profile.tmdb_id,
    },
    r.data
  );
  await store.prisma.movie_profile.update({
    where: {
      id: movie.profile.id,
    },
    data: profile,
  });
  res.status(200).json({ code: 0, msg: "更新成功", data: profile });
}
