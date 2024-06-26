/**
 * @file 全量索引云盘（支持传入文件夹 id 表示仅索引该文件夹）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { DriveAnalysis } from "@/domains/analysis";
import { Job } from "@/domains/job";
import { TaskTypes } from "@/domains/job/constants";
import { FileType } from "@/constants";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.body as Partial<{
    id: string;
    target_folder: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (!drive.has_root_folder()) {
    return e(Result.Err("请先设置索引目录", 30001));
  }
  const tmp_folders = await store.prisma.tmp_file.findMany({
    where: {
      drive_id,
      user_id: user.id,
    },
  });
  if (tmp_folders.length === 0) {
    return e(Result.Err("没有找到可索引的转存文件"));
  }
  const job_res = await Job.New({
    desc: `快速索引云盘「${drive.name}]`,
    type: TaskTypes.DriveAnalysis,
    unique_id: drive.id,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run() {
    const r2 = await DriveAnalysis.New({
      drive,
      user,
      assets: app.assets,
      store,
      on_print(v) {
        job.output.write(v);
      },
    });
    if (r2.error) {
      job.output.write_line(["索引失败", r2.error.message]);
      job.finish();
      return;
    }
    const analysis = r2.data;
    // console.log("[API]admin/drive/analysis_quickly/[id].ts - before await analysis.run", tmp_folders.length);
    await analysis.run(
      tmp_folders.map((file) => {
        const { name, parent_paths, type } = file;
        return {
          name: [parent_paths, name].filter(Boolean).join("/"),
          type: type === FileType.File ? "file" : "folder",
        };
      })
    );
    job.output.write_line(["索引完成"]);
    job.finish();
  }
  run();
  res.status(200).json({
    code: 0,
    msg: "开始索引",
    data: {
      job_id: job.id,
    },
  });
}
