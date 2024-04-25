/**
 * @file 指定索引文件/文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { TaskTypes } from "@/domains/job/constants";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { Job } from "@/domains/job/index";
import { response_error_factory } from "@/utils/server";
import { Result } from "@/types/index";
import { FileType } from "@/constants/index";

export default async function v2_admin_analysis_files(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    drive_id,
    force,
    files: target_folders = [],
  } = req.body as Partial<{
    drive_id: string;
    force: number;
    files: { file_id: string; name: string; type: FileType }[];
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (target_folders.length === 0) {
    return e(Result.Err("请指定要索引的文件"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  if (!target_folders && !drive.has_root_folder()) {
    return e(Result.Err("请先设置索引目录", 30001));
  }
  const job_res = await Job.New({
    desc: `索引云盘「${drive.name}」${(() => {
      if (!target_folders) {
        return "";
      }
      if (!Array.isArray(target_folders)) {
        return "";
      }
      if (target_folders.length === 1) {
        return target_folders[0].name;
      }
      return " 部分文件";
    })()}`,
    type: TaskTypes.DriveAnalysis,
    unique_id: drive.id,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  const r2 = await DriveAnalysis.New({
    drive,
    store,
    user,
    assets: app.assets,
    on_print(v) {
      job.output.write(v);
    },
    on_error() {
      job.finish();
    },
  });
  if (r2.error) {
    return e(r2.error.message);
  }
  const analysis = r2.data;
  job.on_pause(() => {
    analysis.stop();
  });
  analysis.on_percent((percent) => {
    job.update_percent(percent);
  });
  // console.log("[API]admin/drive/analysis/[id].ts - before analysis.run");
  async function run() {
    const the_files_prepare_analysis = target_folders.map((f) => {
      const { file_id, name, type } = f;
      return {
        file_id,
        type,
        name,
      };
    });
    await analysis.run2(the_files_prepare_analysis, { force: true });
    job.output.write_line(["索引完成"]);
    job.finish();
  }
  run();
  return res.status(200).json({
    code: 0,
    msg: "开始索引任务",
    data: {
      job_id: job.id,
    },
  });
}
