/**
 * @file 管理后台/执行指定电视剧同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { ResourceSyncTask } from "@/domains/resource_sync_task";
import { Job } from "@/domains/job";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { Drive } from "@/domains/drive/index";
import { TaskTypes } from "@/domains/job/constants";
import { DriveAnalysis } from "@/domains/analysis";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { FileType } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  const season = await store.prisma.season.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      profile: true,
      sync_tasks: true,
    },
  });
  if (season === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const {
    profile: { name },
    sync_tasks,
  } = season;
  const tasks = sync_tasks
    .filter((bind) => {
      return !bind.invalid;
    })
    .filter(Boolean);
  if (tasks.length === 0) {
    return e(Result.Err("电视剧还没有更新任务"));
  }
  const job_res = await Job.New({
    desc: `更新电视剧 '${name}'`,
    unique_id: id,
    type: TaskTypes.FilesSync,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run() {
    const token = user.settings.tmdb_token;
    if (!token) {
      console.log("[API]tv/sync/[id].ts - after if(!token)");
      return e(Result.Err("缺少 TMDB_TOKEN"));
    }
    const the_files_in_drive: Record<string, { name: string }[]> = {};
    for (let i = 0; i < tasks.length; i += 1) {
      const task = tasks[i];
      const { name, drive_id } = task;
      const drive_res = await Drive.Get({ id: drive_id, user, store });
      if (drive_res.error) {
        // console.log("[API]tv/sync/[id].ts - drive_res.error", drive_res.error.message);
        job.finish();
        return;
      }
      const drive = drive_res.data;
      const added_files: {
        name: string;
        parent_paths: string;
        type: FileType;
      }[] = [];
      const resourceSyncTask = new ResourceSyncTask({
        task,
        user,
        drive,
        client: drive.client,
        store,
        TMDB_TOKEN: token,
        assets: app.assets,
        on_file(v) {
          console.log("[API]tv/sync/[id].ts - ResourceSyncTask on_file", v.name);
          if (v.type !== FileType.File) {
            return;
          }
          added_files.push(v);
        },
        on_print(v) {
          job.output.write(v);
        },
        on_finish() {
          job.output.write(
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: `电视剧 '${name}' 完成同步，开始索引新增影片`,
                }),
              ],
            })
          );
        },
        on_error(error) {
          console.log("[API]tv/sync/[id].ts - ResourceSyncTask on_error", error.message);
          job.throw(error);
        },
      });
      await resourceSyncTask.run();
      the_files_in_drive[drive_id] = the_files_in_drive[drive_id] || [];
      the_files_in_drive[drive_id].push({
        name,
      });
      // console.log("[API]tv/sync/[id].ts - after await analysis.run");
    }
    const drive_ids = Object.keys(the_files_in_drive);
    for (let i = 0; i < drive_ids.length; i += 1) {
      const drive_id = drive_ids[i];
      const files = the_files_in_drive[drive_id];
      const drive_res = await Drive.Get({ id: drive_id, user, store });
      if (drive_res.error) {
        // console.log("[API]tv/sync/[id].ts - drive_res.error", drive_res.error.message);
        job.finish();
        return;
      }
      const drive = drive_res.data;
      const r2 = await DriveAnalysis.New({
        // @ts-ignore
        drive,
        store,
        user,
        assets: app.assets,
        extra_scope: files
          .map((file) => {
            return file.name;
          })
          .filter(Boolean) as string[],
        on_print(v) {
          job.output.write(v);
        },
        on_finish() {
          job.output.write(
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: "索引完成",
                }),
              ],
            })
          );
        },
        on_error(error) {
          job.throw(error);
        },
      });
      if (r2.error) {
        // console.log("[API]tv/sync/[id].ts - after r2.error", r2.error);
        return e(r2);
      }
      const analysis = r2.data;
      // const { root_folder_name } = drive.profile;
      // console.log("[]", tmp_folders);
      // console.log("[API]tv/sync/[id].ts - before await analysis.run", added_files);
      // await analysis.run(
      //   added_files.map((file) => {
      //     const { name, parent_paths, type } = file;
      //     return {
      //       name: [parent_paths, name].filter(Boolean).join("/"),
      //       type: type === FileType.File ? "file" : "folder",
      //     };
      //   })
      // );
    }
    // console.log("[API]tv/sync/[id].ts - before job.finish");
    job.finish();
  }
  run();
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      job_id: job.id,
    },
  });
}
