/**
 * @file 管理后台 刷新/绑定电视剧季详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ProfileRefresh } from "@/domains/profile_refresh";
import { TaskTypes } from "@/domains/job/constants";
import { Job } from "@/domains/job";
import { SeasonProfileRecord, SeasonRecord, TVProfileRecord, TVRecord } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { season_id } = req.query as Partial<{ season_id: string }>;
  const { tmdb_id } = req.body as Partial<{ tmdb_id: number }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!season_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  if (!user.settings.tmdb_token) {
    return e(Result.Err("缺少 TMDB_TOKEN"));
  }
  const season = await store.prisma.season.findFirst({
    where: {
      id: season_id,
      user_id: user.id,
    },
    include: {
      profile: true,
      tv: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (season === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const job_res = await Job.New({
    desc: `更新「${season.tv.profile.name}/${season.season_text}」详情`,
    unique_id: "update_tv_and_season",
    type: TaskTypes.RefreshTVAndSeasonProfile,
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
  async function run(payload: {
    season: SeasonRecord & { profile: SeasonProfileRecord };
    tv: TVRecord & { profile: TVProfileRecord };
  }) {
    const r2 = await refresher.refresh_season_profile(payload, tmdb_id ? { tmdb_id } : undefined);
    // console.log("[API]admin/season/[season_id]/refresh_profile - after refresher.refresh_season_profile");
    if (r2.error) {
      job.output.write(
        new ArticleLineNode({
          children: ["刷新电视剧季详情失败", r2.error.message].map((text) => new ArticleTextNode({ text })),
        })
      );
      job.finish();
      return;
    }
    if (r2.data) {
      const r3 = await refresher.refresh_episode_list(payload);
      // console.log("[API]admin/season/[season_id]/refresh_profile - after refresher.refresh_episode_list");
      if (r3.error) {
        job.output.write(
          new ArticleLineNode({
            children: ["刷新剧集详情失败", r3.error.message].map((text) => new ArticleTextNode({ text })),
          })
        );
        job.finish();
        return;
      }
    }
    // console.log("[API]admin/season/[season_id]/refresh_profile - before job.finish");
    job.finish();
  }
  run({
    season,
    tv: season.tv,
  });
  res.status(200).json({
    code: 0,
    msg: "开始更新",
    data: {
      job_id: job.id,
    },
  });
}
