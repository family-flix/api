/**
 * @file 设置云盘索引根目录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_drive_set_root_folder(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, root_folder_id } = req.body as Partial<{
    id: string;
    root_folder_id: string;
  }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!root_folder_id) {
    return e(Result.Err("缺少文件夹 id"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const { client } = drive;
  const file_res = await client.fetch_file(root_folder_id);
  if (file_res.error) {
    return e(file_res);
  }
  await store.prisma.drive.update({
    where: {
      id: drive_id,
    },
    data: {
      root_folder_id,
      root_folder_name: file_res.data.name,
    },
  });
  return res.status(200).json({ code: 0, msg: "设置索引根目录成功", data: null });
}
