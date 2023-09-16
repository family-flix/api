/**
 * @file 刷新/绑定电影详情
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { MediaSearcher } from "@/domains/searcher";
import { ProfileRefresh } from "@/domains/profile_refresh";
import { Job } from "@/domains/job";
import { TaskTypes } from "@/domains/job/constants";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { movie_id } = req.query as Partial<{ movie_id: string }>;
  const { tmdb_id } = req.body as { tmdb_id: string };
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!movie_id) {
    return e(Result.Err("缺少电影 id"));
  }
  const user = t_res.data;
  const movie = await store.prisma.movie.findFirst({
    where: {
      id: movie_id,
      user_id: user.id,
    },
    include: {
      profile: true,
      parsed_movies: true,
    },
  });
  if (movie === null) {
    return e(Result.Err("没有匹配的电影记录"));
  }
  if (!tmdb_id && !movie.profile) {
    return e(Result.Err("该电影还没有匹配的详情"));
  }
  if (!user.settings.tmdb_token) {
    return e(Result.Err("缺少 TMDB_TOKEN"));
  }
  const searcher = new MediaSearcher({
    user,
    store,
    assets: app.assets,
  });
  const refresher = new ProfileRefresh({
    searcher,
    store,
    user,
  });
  const r = await refresher.refresh_movie_profile(movie, tmdb_id ? { tmdb_id: Number(tmdb_id) } : undefined);
  if (r.error) {
    return e(r.error);
  }
  if (r.data === null) {
    return e(Result.Err("没有要更新的内容"));
  }
  res.status(200).json({ code: 0, msg: "更新成功", data: r.data });
}
