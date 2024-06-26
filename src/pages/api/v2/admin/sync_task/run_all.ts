/**
 * @file 执行所有资源同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { ResourceSyncTask } from "@/domains/resource_sync_task/v2";
import { Job } from "@/domains/job/index";
import { DriveAnalysis } from "@/domains/analysis/index";
import { Drive } from "@/domains/drive/index";
import { TaskTypes } from "@/domains/job/constants";
import { User } from "@/domains/user";
import { ScheduleTask } from "@/domains/schedule";
import { ModelQuery } from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { FileType, ResourceSyncTaskStatus } from "@/constants";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_sync_task_run_all(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const job_res = await Job.New({
    unique_id: "sync_all_tv",
    desc: "同步所有文件夹新增影片",
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
    const where: ModelQuery<"resource_sync_task"> = {
      media_id: { not: null },
      status: ResourceSyncTaskStatus.WorkInProgress,
      invalid: 0,
      user_id: user.id,
    };
    const count = await store.prisma.resource_sync_task.count({ where });
    job.output.write_line(["共", count, "个同步任务"]);
    await walk_model_with_cursor({
      fn: (extra) => {
        return store.prisma.resource_sync_task.findMany({
          where,
          ...extra,
        });
      },
      handler: async (data, index) => {
        const { id, name } = data;
        job.output.write_line(["第", index + 1, "个"]);
        const task_res = await ResourceSyncTask.Get({
          id,
          user,
          store,
          assets: app.assets,
        });
        if (task_res.error) {
          return;
        }
        const task = task_res.data;
        task.on_print((v) => {
          job.output.write(v);
        });
        job.output.write_line([`开始更新 ${name}`]);
        await task.run();
      },
    });
    await walk_model_with_cursor({
      fn: (extra) => {
        return store.prisma.drive.findMany({
          where: {
            user_id: user.id,
          },
          ...extra,
        });
      },
      handler: async (data, index) => {
        const { id } = data;
        const drive_res = await Drive.Get({ id, user, store });
        if (drive_res.error) {
          return;
        }
        const drive = drive_res.data;
        const tmp_folders = await store.prisma.tmp_file.findMany({
          where: {
            drive_id: drive.id,
            user_id: user.id,
          },
        });
        if (tmp_folders.length === 0) {
          return;
        }
        const r2 = await DriveAnalysis.New({
          drive,
          store,
          user,
          assets: app.assets,
          extra_scope: tmp_folders
            .map((tv) => {
              return tv.name;
            })
            .filter(Boolean) as string[],
          on_print(v) {
            job.output.write(v);
          },
          on_error(error) {
            job.throw(error);
          },
        });
        if (r2.error) {
          return;
        }
        const analysis = r2.data;
        await analysis.run(
          tmp_folders.map((file) => {
            const { name, parent_paths, type } = file;
            return {
              name: [parent_paths, name].filter(Boolean).join("/"),
              type: type === FileType.File ? "file" : "folder",
            };
          })
        );
      },
    });
    job.output.write_line(["索引完成"]);
    const schedule = new ScheduleTask({ app, store });
    schedule.update_user_daily_updated(user);
    job.finish();
  }
  run();
  return res.status(200).json({ code: 0, msg: "", data: { job_id: job.id } });
}
