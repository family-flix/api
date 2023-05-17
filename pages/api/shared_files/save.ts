/**
 * @file 转存指定分享文件到指定网盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url, file_id, file_name, drive_id } = req.query as Partial<{
    url: string;
    /** 分享文件的 file_id */
    file_id: string;
    /** 分享文件的名称 */
    file_name: string;
    /** 转存到哪个网盘 */
    drive_id: string;
  }>;
  if (!url) {
    return e("缺少分享链接参数");
  }
  if (!file_id) {
    return e("请指定要转存的文件");
  }
  if (!file_name) {
    return e("请传入转存文件名称");
  }
  if (!drive_id) {
    return e("请指定转存到哪个网盘");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const folder_res = await store.find_file({
    name: file_name,
    drive_id,
    user_id,
  });
  if (folder_res.error) {
    return e(folder_res);
  }
  if (folder_res.data) {
    return e("网盘内已有同名文件夹");
  }
  const r2 = await store.find_tmp_file({
    name: file_name,
    drive_id,
    user_id,
  });
  if (r2.error) {
    return e(folder_res);
  }
  if (r2.data) {
    return e("网盘内已有同名文件夹");
  }
  const drive_res = await store.find_drive({ id: drive_id, user_id });
  if (drive_res.error) {
    return e(drive_res);
  }
  if (!drive_res) {
    return e("No matched record of drive");
  }
  const client = new AliyunDriveClient({ drive_id, store });
  const r1 = await client.save_shared_files({
    url,
    file_id,
  });
  if (r1.error) {
    return e(r1);
  }
  await store.add_tmp_file({
    name: file_name,
    drive_id,
    user_id,
    type: 0,
    parent_paths: "",
  });
  if (file_name.includes("更新中")) {
    const r4 = await store.find_shared_files_in_progress({
      url,
      file_id,
      name: file_name,
      user_id,
    });
    if (!r4.error) {
      if (!r4.data) {
        await store.add_shared_files_in_progress({
          url,
          name: file_name,
          file_id,
          user_id,
        });
      }
    }
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: r1.data,
  });
}
