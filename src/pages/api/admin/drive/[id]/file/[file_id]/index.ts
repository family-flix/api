/**
 * @file 获取指定云盘、指定文件详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Result, resultify, UnpackedResult } from "@/domains/result/index";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    id: drive_id,
    file_id = "root",
    next_marker = "",
    name,
    page_size: page_size_str,
  } = req.body as Partial<{
    id: string;
    file_id: string;
    next_marker: string;
    name: string;
    page_size: string;
  }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page_size = to_number(page_size_str, 24);
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (name) {
    const r = await drive.client.search_files({ name, type: "folder", marker: next_marker });
    if (r.error) {
      return e(r);
    }
    res.status(200).json({ code: 0, msg: "", data: r.data });
    return;
  }
  const r = await drive.client.fetch_files(file_id, {
    marker: next_marker,
    page_size,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
