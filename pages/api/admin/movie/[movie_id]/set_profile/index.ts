/**
 * @file 刷新电影详情
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { MediaSearcher } from "@/domains/searcher";
import { ProfileRefresh } from "@/domains/profile_refresh";
import { Job } from "@/domains/job";
import { TaskTypes } from "@/domains/job/constants";
import { MovieProfileRecord, MovieRecord } from "@/domains/store/types";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { movie_id } = req.query as Partial<{ movie_id: string }>;
  const { source, unique_id } = req.body as Partial<{ source: number; unique_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!movie_id) {
    return e(Result.Err("缺少电影 id"));
  }
  if (!unique_id) {
    return e(Result.Err("缺少电影详情 id"));
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
  const searcher_res = await MediaSearcher.New({
    user,
    store,
    assets: app.assets,
    on_print(v) {
      job.output.write(v);
    },
  });
  if (searcher_res.error) {
    return e(searcher_res);
  }
  const searcher = searcher_res.data;
  const job_res = await Job.New({
    unique_id: movie_id,
    desc: "变更电影详情",
    type: TaskTypes.RefreshMovieProfile,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const refresher = new ProfileRefresh({
    searcher,
    store,
    user,
    on_print(node) {
      job.output.write(node);
    },
  });
  async function run(
    movie: MovieRecord & { profile: MovieProfileRecord },
    extra: { source?: number; unique_id: string }
  ) {
    const r = await refresher.change_movie_profile(movie, extra);
    if (r.error) {
      job.finish();
      return e(r.error);
    }
    if (r.data === null) {
      job.finish();
      return e(Result.Err("没有要更新的内容"));
    }
    job.finish();
  }
  run(movie, { source, unique_id });
  res.status(200).json({
    code: 0,
    msg: "开始更新",
    data: {
      job_id: job.id,
    },
  });
}
