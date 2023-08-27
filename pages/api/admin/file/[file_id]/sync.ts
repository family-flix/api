/**
 * @file 管理后台/执行指定电视剧同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ResourceSyncTask } from "@/domains/resource_sync_task";
import { Job } from "@/domains/job";
import { FileSyncTaskRecord, ParsedTVRecord } from "@/domains/store/types";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { Drive } from "@/domains/drive";
import { TaskTypes } from "@/domains/job/constants";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, drive_id } = req.query as Partial<{ file_id: string; drive_id: string }>;
  if (!file_id) {
    return e(Result.Err("缺少文件夹 id"));
  }
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
  const parsed_tv = await store.prisma.parsed_tv.findFirst({
    where: {
      file_id,
      binds: {
        every: {
          invalid: 0,
        },
      },
    },
    include: {
      binds: true,
    },
  });
  if (!parsed_tv) {
    return e(Result.Err("该文件夹没有关联同步任务"));
  }
  if (parsed_tv.binds.length === 0) {
    return e(Result.Err("该文件夹没有关联同步任务"));
  }
  const valid_bind = parsed_tv.binds.find((bind) => {
    return bind.invalid === 0;
  });
  if (!valid_bind) {
    return e(Result.Err("该文件夹没有关联同步任务"));
  }
  const job_res = await Job.New({
    desc: `同步文件夹变更`,
    unique_id: file_id,
    type: TaskTypes.FolderSync,
    user_id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run(bind: FileSyncTaskRecord & { parsed_tv: ParsedTVRecord }, drive_id: string) {
    const token = settings.tmdb_token;
    if (!token) {
      console.log("[API]tv/sync/[id].ts - after if(!token)");
      return e(Result.Err("缺少 TMDB_TOKEN"));
    }
    const drive_res = await Drive.Get({ id: drive_id, user_id, store });
    if (drive_res.error) {
      // console.log("[API]tv/sync/[id].ts - drive_res.error", drive_res.error.message);
      job.finish();
      return;
    }
    const drive = drive_res.data;
    const resourceSyncTask = new ResourceSyncTask({
      task: bind,
      user,
      drive,
      client: drive.client,
      store,
      TMDB_TOKEN: token,
      assets: app.assets,
      wait_complete: true,
      on_print(v) {
        job.output.write(v);
      },
      on_finish() {
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `完成同步`,
              }),
            ],
          })
        );
        job.finish();
      },
      on_error(error) {
        // console.log("[API]tv/sync/[id].ts - ResourceSyncTask on_error", error.message);
        job.throw(error);
      },
    });
    await resourceSyncTask.run();
    // console.log("[API]tv/sync/[id].ts - before job.finish");
  }
  run(
    {
      ...valid_bind,
      parsed_tv,
    },
    drive_id
  );
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      job_id: job.id,
    },
  });
}
