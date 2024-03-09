/**
 * @file 管理后台/获取解析出的剧集详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { Job, TaskTypes } from "@/domains/job";
import { ParsedTVRecord } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { parsed_tv_id: id } = req.query as Partial<{ parsed_tv_id: string }>;
  const { season_id } = req.body as Partial<{ season_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少解析文件夹 id"));
  }
  if (!season_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  const parsed_tv = await store.prisma.parsed_tv.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (parsed_tv === null) {
    return e(Result.Err("没有匹配的解析结果"));
  }
  if (!parsed_tv.file_id) {
    return e(Result.Err("该解析结果没有关联文件夹"));
  }
  const file = await store.prisma.file.findFirst({
    where: {
      file_id: parsed_tv.file_id,
      user_id: user.id,
    },
  });
  if (!file) {
    return e(Result.Err("该解析结果没有关联文件夹"));
  }
  const season = await store.prisma.season.findFirst({
    where: {
      id: season_id,
      user_id: user.id,
    },
  });
  if (season === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  await store.prisma.parsed_tv.update({
    where: {
      id: parsed_tv.id,
    },
    data: {
      tv_id: season.tv_id,
    },
  });
  parsed_tv.tv_id = season.tv_id;
  const task_res = await Job.New({
    unique_id: [id, season_id].join("/"),
    desc: "手动关联电视剧后索引",
    type: TaskTypes.DriveAnalysis,
    user_id: user.id,
    app,
    store,
  });
  if (task_res.error) {
    return e(task_res);
  }
  const task = task_res.data;
  const drive_res = await Drive.Get({ id: parsed_tv.drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  //   const analysis_res = await DriveAnalysis.New({
  //     drive,
  //     user,
  //     store,
  //     assets: app.assets,
  //     on_print(node) {
  //       task.output.write(node);
  //     },
  //   });
  //   if (analysis_res.error) {
  //     return Result.Err(analysis_res);
  //   }
  //   const analysis = analysis_res.data;
  const searcher_res = await MediaSearcher.New({
    drive,
    user,
    store,
    assets: app.assets,
    on_print(node) {
      task.output.write(node);
    },
  });
  if (searcher_res.error) {
    return e(searcher_res);
  }
  const searcher = searcher_res.data;
  async function run(parsed_tv: ParsedTVRecord) {
    const parsed_seasons = await store.prisma.parsed_season.findMany({
      where: {
        parsed_tv_id: parsed_tv.id,
        user_id: user.id,
      },
    });
    const prefix = `[${file?.name}]`;
    for (let i = 0; i < parsed_seasons.length; i += 1) {
      const parsed_season = parsed_seasons[i];
      await searcher.process_parsed_season({ parsed_tv, parsed_season });
      task.output.write(
        new ArticleLineNode({
          children: [prefix, "处理完", parsed_season.season_number].map((text) => new ArticleTextNode({ text })),
        })
      );
      const parsed_episodes = await store.prisma.parsed_episode.findMany({
        where: {
          // parsed_season_id: parsed_season.id,
          user_id: user.id,
        },
      });
      for (let i = 0; i < parsed_episodes.length; i += 1) {
        const parsed_episode = parsed_episodes[i];
        await searcher.process_parsed_episode({ parsed_tv, parsed_episode });
        task.output.write(
          new ArticleLineNode({
            children: [prefix, "处理完", parsed_season.season_number, "/", parsed_episode.episode_number].map(
              (text) => new ArticleTextNode({ text })
            ),
          })
        );
      }
    }
    task.finish();
  }
  run(parsed_tv);
  res.status(200).json({
    code: 0,
    msg: "关联成功，开始索引",
    data: {
      job_id: task.id,
    },
  });
}
