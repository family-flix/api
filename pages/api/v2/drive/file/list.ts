/**
 * @file 获取指定云盘、指定文件夹的子文件/文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    drive_id,
    file_id = "root",
    next_marker = "",
    page_size,
  } = req.body as Partial<{
    drive_id: string;
    file_id: string;
    next_marker: string;
    name: string;
    page_size: number;
  }>;
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
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (name) {
    const r = await drive.client.search_files(name, "folder");
    if (r.error) {
      return e(Result.Err(r.error.message));
    }
    res.status(200).json({ code: 0, msg: "", data: r.data });
    return;
  }
  const r = await drive.client.fetch_files(file_id, {
    marker: next_marker,
    page_size,
  });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
