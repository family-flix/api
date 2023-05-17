/**
 * @file 给指定云盘的指定文件夹内，添加一个新文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { id: drive_id } = req.query as Partial<{
    id: string;
  }>;
  const { parent_file_id = "root", name } = req.body as Partial<{
    parent_file_id: string;
    name: string;
  }>;
  const { authorization } = req.headers;
  if (!drive_id) {
    return e("缺少云盘 id 参数");
  }
  if (!name) {
    return e("缺少文件夹名称");
  }
  const t = await User.New(authorization);
  if (t.error) {
    return e(t);
  }
  const client = new AliyunDriveClient({
    drive_id,
    store,
  });
  const r = await client.add_folder({
    parent_file_id,
    name,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
