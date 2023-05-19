/**
 * @file 阿里云盘 获取文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { store } from "@/store";
import { response_error_factory } from "@/utils/backend";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { parent_file_id, drive_id } = req.query as Partial<{
    parent_file_id: string;
    drive_id: string;
  }>;
  if (!drive_id) {
    return e("Missing drive id");
  }
  const client = new AliyunDriveClient({ drive_id, store: store });
  const { error, data } = await client.fetch_files(parent_file_id as string);
  if (error) {
    res.status(200).json({ code: 1003, msg: error.message, data: null });
    return;
  }
  res.status(200).json({ code: 0, msg: "", data });
}
