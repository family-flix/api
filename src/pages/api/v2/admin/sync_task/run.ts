/**
 * @file 执行指定同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ResourceSyncTask } from "@/domains/resource_sync_task/v2";
import { Job } from "@/domains/job/index";
import { Drive } from "@/domains/drive/v2";
import { TaskTypes } from "@/domains/job/constants";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { FileType } from "@/constants/index";

export default async function v2_admin_sync_task_run(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少同步任务 id"));
  }
  const task_res = await ResourceSyncTask.Get({
    id,
    user,
    store,
    assets: app.assets,
  });
  if (task_res.error) {
    return e(Result.Err(task_res.error.message));
  }
  const task = task_res.data;
  const drive_res = await Drive.Get({ id: task.drive_client.id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  const { name } = task.profile;
  const job_res = await Job.New({
    unique_id: id,
    desc: `同步资源「${name}」`,
    type: TaskTypes.FilesSync,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  task.on_print((v) => {
    job.output.write(v);
  });
  job.on_pause(() => {
    task.stop();
  });
  (async () => {
    await task.run();
    const the_files_prepare_analysis = [
      {
        file_id: task.profile.file_id_link_resource,
        name: task.profile.file_name_link_resource,
        type: FileType.Folder,
      },
    ].map((f) => {
      const { file_id, name, type } = f;
      return {
        file_id,
        type,
        name,
      };
    });
    const r2 = await DriveAnalysis.New({
      drive,
      store,
      user,
      assets: app.assets,
      on_print(v) {
        job.output.write(v);
      },
    });
    if (r2.error) {
      job.throw(r2.error);
      return;
    }
    const analysis = r2.data;
    const r = await analysis.run2(the_files_prepare_analysis, { force: true });
    if (r.error) {
      job.throw(r.error);
      return;
    }
    job.finish();
  })();
  return res.status(200).json({ code: 0, msg: "开始同步", data: { job_id: job.id } });
}
