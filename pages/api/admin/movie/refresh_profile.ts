/**
 * @file 刷新(从 TMDB 拉取最新)所有电影
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Job } from "@/domains/job";
import { TaskTypes } from "@/domains/job/constants";
import { ProfileRefresh } from "@/domains/profile_refresh";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { app, store } from "@/store";
import { MediaSearcher } from "@/domains/searcher";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!user.settings.tmdb_token) {
    return e(Result.Err("缺少 TMDB_TOKEN"));
  }
  const job_res = await Job.New({
    desc: "更新电影信息",
    unique_id: "update_movie",
    type: TaskTypes.RefreshMovieProfile,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const searcher = new MediaSearcher({
    store,
    assets: app.assets,
    tmdb_token: user.settings.tmdb_token,
  });
  const refresher = new ProfileRefresh({
    tmdb_token: user.settings.tmdb_token,
    searcher,
    store,
    user,
    on_print(node) {
      job.output.write(node);
    },
    on_finish() {
      job.finish();
    },
  });
  refresher.refresh_movies();
  res.status(200).json({
    code: 0,
    msg: "开始刷新",
    data: {
      job_id: job.id,
    },
  });
}
