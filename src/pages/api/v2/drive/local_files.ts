/**
 * @file 获取指定云盘、指定文件夹的子文件/文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/domains/result/index";
import { LocalFileDriveClient } from "@/domains/clients/local";
import { response_error_factory } from "@/utils/server";

export default async function v2_local_file_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
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
  const client = new LocalFileDriveClient({ unique_id: "/" });
  const r = await client.fetch_files(file_id, {
    marker: next_marker,
    page_size,
  });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  return res.status(200).json({ code: 0, msg: "", data: r.data });
}
