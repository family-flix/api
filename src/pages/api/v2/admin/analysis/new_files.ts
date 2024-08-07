/**
 * @file 仅索引新添加的文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { Job } from "@/domains/job/index";
import { TaskTypes } from "@/domains/job/constants";
import { response_error_factory } from "@/utils/server";
import { Result } from "@/domains/result/index";

export default async function v2_admin_analysis_new_files(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id } = req.body as Partial<{ drive_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  if (!drive.has_root_folder()) {
    return e(Result.Err("请先设置索引目录", 30001));
  }
  const tmp_folders = await store.prisma.tmp_file.findMany({
    where: {
      drive_id,
      file_id: {
        not: null,
      },
      user_id: user.id,
    },
  });
  if (tmp_folders.length === 0) {
    return e(Result.Err("没有找到可索引的转存文件"));
  }
  const analysis_res = await DriveAnalysis.New({
    drive,
    user,
    assets: app.assets,
    store,
    on_print(v) {
      job.output.write(v);
    },
  });
  if (analysis_res.error) {
    return e(Result.Err(analysis_res.error.message));
  }
  const analysis = analysis_res.data;
  const job_res = await Job.New({
    desc: `快速索引云盘「${drive.name}]`,
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
  job.on_pause(() => {
    analysis.stop();
  });
  analysis.on_percent((percent) => {
    job.update_percent(percent);
  });
  async function run() {
    // console.log("[API]admin/drive/analysis_quickly/[id].ts - before await analysis.run", tmp_folders.length);
    const the_files_prepare_analysis = tmp_folders
      .filter((f) => {
        return f.file_id;
      })
      .map((f) => {
        const { file_id, name, type } = f;
        return {
          file_id: file_id as string,
          type,
          name,
        };
      });
    job.output.write_line([`共${the_files_prepare_analysis.length}个新文件`]);
    await analysis.run2(the_files_prepare_analysis, { force: true });
    job.output.write_line(["索引完成"]);
    job.finish();
  }
  run();
  return res.status(200).json({
    code: 0,
    msg: "开始索引",
    data: {
      job_id: job.id,
    },
  });
}
