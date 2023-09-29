/**
 * @file 刷新(从 TMDB 拉取最新)指定时间范围内的电视剧、季详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Job } from "@/domains/job";
import { TaskTypes } from "@/domains/job/constants";
import { MediaSearcher } from "@/domains/searcher";
import { ProfileRefresh } from "@/domains/profile_refresh";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";

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
    desc: "刷新电视剧、季信息",
    unique_id: "update_movie_and_season",
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
  async function run() {
    await refresher.refresh_season_list({
      async after(payload) {
        await refresher.refresh_episode_list(payload);
        // const { season, tv } = payload;
        // const episodes = await store.prisma.episode.findMany({
        //   where: {
        //     season_id: season.id,
        //     user_id: user.id,
        //   },
        //   include: {
        //     profile: true,
        //   },
        // });
        // for (let i = 0; i < episodes.length; i += 1) {
        //   await (async () => {
        //     const episode = episodes[i];
        //     const episode_profile_res = await refresher.client.fetch_episode_profile({
        //       tv_id: Number(tv.profile.unique_id),
        //       season_number: season.season_number,
        //       episode_number: episode.episode_number,
        //     });
        //     if (episode_profile_res.error) {
        //       return;
        //     }
        //     const profile = episode_profile_res.data;
        //     job.output.write(
        //       new ArticleLineNode({
        //         children: ["刷新剧集", tv.profile.name, season.season_text, episode.episode_text].map(
        //           (text) => new ArticleTextNode({ text: String(text) })
        //         ),
        //       })
        //     );
        //     await refresher.refresh_episode_profile(episode, profile);
        //   })();
        // }
      },
    });
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
