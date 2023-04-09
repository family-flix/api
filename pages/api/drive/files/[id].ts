/**
 * @file 获取指定云盘、指定文件夹的子文件/文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { store } from "@/store/sqlite";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const {
    id: drive_id,
    file_id = "root",
    next_marker = "",
    name,
    page_size = "24",
  } = req.query as Partial<{
    id: string;
    file_id: string;
    next_marker: string;
    name: string;
    page_size: string;
  }>;
  if (!drive_id) {
    return e("缺少云盘 id 参数");
  }
  const client = new AliyunDriveClient({
    drive_id,
    store,
  });
  if (name) {
    const r = await client.search_files(name, "folder");
    if (r.error) {
      return e(r);
    }
    res.status(200).json({ code: 0, msg: "", data: r.data });
    return;
  }
  const r = await client.fetch_files(file_id, {
    marker: next_marker,
    page_size: Number(page_size),
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
