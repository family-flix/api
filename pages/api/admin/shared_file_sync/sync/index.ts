/**
 * @file 执行所有资源同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { ResourceSyncTask } from "@/domains/resource_sync_task";
import { Job } from "@/domains/job";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";
import { app, store } from "@/store";
import { TaskTypes } from "@/domains/job/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
  let page = 1;
  let no_more = false;
  const page_size = 20;

  const job_res = await Job.New({
    unique_id: "sync_all_tv",
    desc: "同步所有电视剧新增影片",
    type: TaskTypes.TVSync,
    user_id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  (async () => {
    do {
      const tasks = await store.prisma.bind_for_parsed_tv.findMany({
        where: {
          in_production: 1,
          invalid: 0,
          user_id,
        },
        include: {
          parsed_tv: {
            include: {
              tv: {
                include: { profile: true },
              },
            },
          },
        },
        skip: (page - 1) * page_size,
        take: page_size,
      });
      page += 1;
      no_more = tasks.length === 0;
      for (let i = 0; i < tasks.length; i += 1) {
        await (async () => {
          const { id, url, file_id, name, parsed_tv_id, parsed_tv } = tasks[i];
          const task_res = await ResourceSyncTask.Get({
            id,
            user,
            store,
            TMDB_TOKEN: settings.tmdb_token,
            assets: app.assets,
          });
          if (task_res.error) {
            return;
          }
          const task = task_res.data;
          task.on_print((v) => {
            job.output.write(v);
          });
          job.output.write(
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: `开始更新 ${(() => {
                    if (parsed_tv.tv?.profile) {
                      return parsed_tv.tv?.profile.name || parsed_tv.tv?.profile.original_name;
                    }
                    return parsed_tv.name || parsed_tv.file_name || name;
                  })()}`,
                }),
              ],
            })
          );
          const r = await task.run();
          if (r.error) {
            return;
          }
        })();
      }
    } while (no_more === false);
    job.finish();
  })();
  res.status(200).json({ code: 0, msg: "", data: { job_id: job.id } });
}
