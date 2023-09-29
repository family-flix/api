/**
 * @file 管理后台 刷新/绑定电视剧详情
 * @deprecated
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ProfileRefresh } from "@/domains/profile_refresh";
import { TaskTypes } from "@/domains/job/constants";
import { Job } from "@/domains/job";
import { TVProfileRecord, TVRecord } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { unique_id } = req.body as { unique_id: string };
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  if (!user.settings.tmdb_token) {
    return e(Result.Err("缺少 TMDB_TOKEN"));
  }
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      profile: true,
    },
  });
  if (tv === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const job_res = await Job.New({
    desc: `更新「${tv.profile.name}」详情、季详情`,
    unique_id: "update_tv_and_season",
    type: TaskTypes.RefreshMedia,
    user_id: user.id,
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
  async function run(tv: TVRecord & { profile: TVProfileRecord }) {
    const r = await refresher.change_tv_profile(tv, { unique_id: unique_id });
    if (r.error) {
      job.throw(r.error);
      return;
    }
    job.finish();
  }
  run(tv);
  res.status(200).json({
    code: 0,
    msg: "开始更新",
    data: {
      job_id: job.id,
    },
  });
}
