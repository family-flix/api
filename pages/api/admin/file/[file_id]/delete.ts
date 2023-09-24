/**
 * @file 删除指定文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { Job, TaskTypes } from "@/domains/job";
import { FileRecord } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, drive_id } = req.query as Partial<{
    file_id: string;
    drive_id: string;
  }>;
  if (!file_id) {
    return e(Result.Err("缺少文件 file_id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const file_res = await store.find_file({
    file_id,
    user_id: user.id,
  });
  if (file_res.error) {
    return e(file_res);
  }
  const file = file_res.data;
  if (!file) {
    if (drive_id) {
      const drive_res = await Drive.Get({ id: drive_id, user, store });
      if (drive_res.error) {
        return e(drive_res);
      }
      const drive = drive_res.data;
      const r = await drive.client.delete_file(file_id);
      if (r.error) {
        return e(r);
      }
      res.status(200).json({ code: 0, msg: "删除成功", data: null });
      return;
    }
    return e(Result.Err("没有匹配的记录"));
  }
  const drive_res = await Drive.Get({ id: file.drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const task_res = await Job.New({
    desc: `删除「${file.name}」`,
    unique_id: "delete_file",
    type: TaskTypes.DeleteDriveFile,
    user_id: user.id,
    store,
  });
  if (task_res.error) {
    return e(task_res);
  }
  const task = task_res.data;
  async function run(file: FileRecord) {
    drive.on_print((node) => {
      task.output.write(node);
    });
    await drive.delete_file_in_drive(file.file_id);
    task.finish();
  }
  run(file);
  res.status(200).json({
    code: 0,
    msg: "开始删除",
    data: {
      job_id: task.id,
    },
  });
}
