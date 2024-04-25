/**
 * @file 重命名指定文件，并重新索引
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { DriveAnalysis } from "@/domains/analysis";
import { Job, TaskTypes } from "@/domains/job";
import { FileRecord } from "@/domains/store/types";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, drive_id } = req.body as Partial<{ file_id: string; drive_id: string }>;
  const { name } = req.body as Partial<{ name: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件 file_id"));
  }
  if (!name) {
    return e(Result.Err("缺少新的文件名"));
  }
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
      const r = await drive.client.rename_file(file_id, name);
      if (r.error) {
        return e(r);
      }
      res.status(200).json({ code: 0, msg: "重命名成功", data: null });
      return;
    }
    return e(Result.Err("没有匹配的记录"));
  }
  const drive_res = await Drive.Get({ id: file.drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res));
  }
  const drive = drive_res.data;
  const r = await drive.rename_file(file, { name });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "重命名成功", data: null });
}
