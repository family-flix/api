/**
 * @file 给指定云盘的指定文件夹内，添加一个新文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

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
    return e("缺少云盘 id");
  }
  if (!name) {
    return e("缺少文件夹名称");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const client = drive.client;
  const r = await client.create_folder({
    parent_file_id,
    name,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "新增文件夹成功", data: r.data });
}
