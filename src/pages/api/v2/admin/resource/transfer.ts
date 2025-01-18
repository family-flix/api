/**
 * @file 转存分享资源到指定云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ResourceSyncTask } from "@/domains/resource_sync_task/v2";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { Drive } from "@/domains/drive/v2";
import { DriveTypes } from "@/domains/drive/constants";
import { Job, TaskTypes } from "@/domains/job";
import { BOJUDriveClient } from "@/domains/clients/boju_cc";
import { FileType } from "@/constants";

export default async function v2_admin_resource_transfer(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url, code, file_id, file_name, drive_id } = req.body as Partial<{
    /** 分享资源链接 */
    url: string;
    /** 分享资源密码 */
    code: string;
    /** 要转存的分享文件的 file_id */
    file_id: string;
    /** 要转存的分享文件的名称 */
    file_name: string;
    /** 转存到哪个云盘 */
    drive_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!url) {
    return e(Result.Err("缺少分享资源链接"));
  }
  if (!file_id) {
    return e(Result.Err("请指定要转存的文件"));
  }
  if (!file_name) {
    return e(Result.Err("请传入转存文件名称"));
  }
  if (!drive_id) {
    return e(Result.Err("请指定转存到哪个网盘"));
  }
  const r1 = await Drive.Get({ id: drive_id, store });
  if (r1.error) {
    return e(Result.Err(r1.error.message));
  }
  const drive = r1.data;
  // console.log("[API]v2/admin/resource/transfer - before ", drive.type);
  if (drive.type === DriveTypes.BojuCC) {
    await store.prisma.file.create({
      data: {
        id: file_id,
        file_id,
        name: file_name,
        type: FileType.Folder,
        parent_file_id: BOJUDriveClient.ROOT_ID,
        parent_paths: "root",
        drive_id,
        user_id: user.id,
      },
    });
    const job_res = await Job.New({
      unique_id: file_id,
      desc: `转存资源「${file_name}」到云盘「${drive.name}」`,
      type: TaskTypes.Transfer,
      user_id: user.id,
      app,
      store,
    });
    if (job_res.error) {
      return e(Result.Err(job_res.error.message));
    }
    const job = job_res.data;
    await ResourceSyncTask.CreatePendingAnalysisTask({
      url,
      code,
      file_id,
      name: file_name,
      drive,
      user,
      job,
      store,
    });
    await job.finish();
    return res.status(200).json({
      code: 0,
      msg: "完成",
      data: {
        job_id: job.id,
      },
    });
  }
  const r = await ResourceSyncTask.Transfer(
    {
      url,
      pwd: code,
      file_id,
      file_name,
      drive_id,
    },
    {
      user,
      app,
      store,
    }
  );
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  return res.status(200).json({
    code: 0,
    msg: "开始转存",
    data: {
      job_id: r.data.job_id,
    },
  });
}
