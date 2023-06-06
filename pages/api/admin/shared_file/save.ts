/**
 * @file 转存分享文件到指定网盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { FileType } from "@/constants";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url, file_id, file_name, drive_id } = req.body as Partial<{
    /** 分享资源链接 */
    url: string;
    /** 要转存的分享文件的 file_id */
    file_id: string;
    /** 要转存的分享文件的名称 */
    file_name: string;
    /** 转存到哪个云盘 */
    drive_id: string;
  }>;
  if (!url) {
    return e("缺少分享资源链接");
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
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const existing1_res = await store.find_file({
    name: file_name,
    drive_id,
    user_id,
  });
  if (existing1_res.error) {
    return e(existing1_res);
  }
  if (existing1_res.data) {
    return e("云盘内已有同名文件夹");
  }
  const existing2_res = await store.find_tmp_file({
    name: file_name,
    drive_id,
    user_id,
  });
  if (existing2_res.error) {
    return e(existing2_res);
  }
  if (existing2_res.data) {
    return e("最近转存过同名文件");
  }
  const drive_res = await Drive.Get({ id: drive_id, user_id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const { profile, client } = drive;
  if (!profile.root_folder_name) {
    return e("请先为云盘添加索引根目录");
  }
  // await client.fetch_share_profile(url, { force: true });
  const r1 = await client.save_shared_files({
    url,
    file_id,
  });
  if (r1.error) {
    return e(r1);
  }
  await store.add_tmp_file({
    name: file_name,
    type: FileType.Folder,
    parent_paths: profile.root_folder_name,
    drive_id,
    user_id,
  });
  const r4 = await store.find_shared_file_save({
    url,
    file_id,
    name: file_name,
    drive_id,
    user_id,
  });
  if (r4.error) {
    return e(r4);
  }
  if (!r4.data) {
    await store.add_shared_file_save({
      url,
      file_id,
      name: file_name,
      drive_id,
      user_id,
    });
  }
  res.status(200).json({
    code: 0,
    msg: "转存成功",
    data: null,
  });
}
