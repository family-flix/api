/**
 * @file 对一个任务做最终处理
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { store } from "@/store";

const { find_aliyun_drives, delete_async_task, find_async_task } = store;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, action, drive_id, folder_id, tv_id } = req.query as Partial<{
    id: string;
    action: "save" | "drop";
    drive_id: string;
    tv_id: string;
    folder_id: string;
  }>;

  if (!folder_id) {
    return e("Missing folder_id");
  }
  if (!tv_id) {
    return e("Missing tv_id");
  }
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const existing_task_resp = await find_async_task({ id });
  if (existing_task_resp.error) {
    return e(existing_task_resp);
  }
  if (!existing_task_resp.data) {
    return e("Task not existing");
  }
  const { status, unique_id } = existing_task_resp.data;
  if (status === "Running") {
    return e("The task is still running");
  }
  if (action === "save") {
    const drive_id_resp = await (async () => {
      if (drive_id) {
        return Result.Ok({ id: drive_id });
      }
      const drives_resp = await find_aliyun_drives({ user_id });
      if (drives_resp.error) {
        return drives_resp;
      }
      if (drives_resp.data.length === 0) {
        return Result.Err("Please add drive first");
      }
      return Result.Ok({ id: drives_resp.data[0].id });
    })();
    if (drive_id_resp.error) {
      return e(drive_id_resp);
    }
    const d_id = drive_id_resp.data.id;
    const client = new AliyunDriveClient({
      drive_id: d_id,
      store: store,
    });
    const r1 = await client.save_shared_files({
      url: unique_id,
      file_id: folder_id,
    });
    if (r1.error) {
      return e(r1);
    }
    return res
      .status(200)
      .json({ code: 0, msg: "Save shared files success", data: null });
  }
  if (action === "drop") {
    const r2 = await delete_async_task({ id });
    if (r2.error) {
      return e(r2);
    }
    return res
      .status(200)
      .json({ code: 0, msg: "Delete task success", data: null });
  }
  return e("The action is incorrect");
  // res.status(200).json({ code: 0, msg: "", data: null });
}
