/**
 * @file 管理后台 给指定电视剧季设置一个新的详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ProfileRefresh } from "@/domains/profile_refresh";
import { TaskTypes } from "@/domains/job/constants";
import { Job } from "@/domains/job";
import { SeasonProfileRecord, SeasonRecord, TVProfileRecord, TVRecord } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { season_id } = req.query as Partial<{ season_id: string }>;
  const { source, unique_id } = req.body as Partial<{ source: number; unique_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!season_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  if (!unique_id) {
    return e(Result.Err("缺少详情信息 id"));
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
      parsed_seasons: true,
      parsed_episodes: true,
    },
  });
  if (season === null) {
    return e(Result.Err("没有匹配的电视剧季记录"));
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
    desc: `更新「${season.tv.profile.name}/${season.season_text}」详情`,
    unique_id: "update_tv_and_season",
    type: TaskTypes.ChangeTVAndSeasonProfile,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
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
    payload: {
      tv: TVRecord & { profile: TVProfileRecord };
      season: SeasonRecord & { profile: SeasonProfileRecord };
    },
    extra: {
      source?: number;
      unique_id: string;
    }
  ) {
    const r1 = await refresher.change_season_profile(payload, extra);
    // console.log("[API]admin/season/[season_id]/refresh_profile - after refresher.refresh_season_profile");
    if (r1.error) {
      job.output.write_line(["刷新电视剧季详情失败，因为", r1.error.message]);
      job.finish();
      return;
    }
    job.finish();
  }
  run(
    {
      season,
      tv: season.tv,
    },
    {
      source,
      unique_id,
    }
  );
  res.status(200).json({
    code: 0,
    msg: "开始更新",
    data: {
      job_id: job.id,
    },
  });
}
