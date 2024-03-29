/**
 * @file 刷新(从 TMDB 拉取最新)所有电视剧、季详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { Job } from "@/domains/job";
import { TaskTypes } from "@/domains/job/constants";
import { MediaSearcher } from "@/domains/searcher";
import { ProfileRefresh } from "@/domains/profile_refresh";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";

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
    desc: "更新电视剧、季信息",
    unique_id: "update_tv_and_season",
    type: TaskTypes.RefreshMedia,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const searcher_res = await MediaSearcher.New({
    user,
    store,
    assets: app.assets,
    on_print(node) {
      job.output.write(node);
    },
  });
  if (searcher_res.error) {
    return e(searcher_res);
  }
  const searcher = searcher_res.data;
  const refresher = new ProfileRefresh({
    searcher,
    store,
    user,
    on_print(node) {
      job.output.write(node);
    },
  });
  async function run() {
    await refresher.refresh_tv_list();
    job.finish();
  }
  run();
  res.status(200).json({
    code: 0,
    msg: "开始刷新",
    data: {
      job_id: job.id,
    },
  });
}
