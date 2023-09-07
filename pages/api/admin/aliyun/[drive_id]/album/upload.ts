/**
 * @file 上传文件到阿里云盘的 相册盘
 */
import fs from "fs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Drive } from "@/domains/drive";
import dayjs from "dayjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  //   const { name } = req.body as Partial<{ name: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const drive_res = await Drive.Get({ id, user_id: user.id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const album_drive_res = await drive.client.fetch_album_drive();
  if (album_drive_res.error) {
    return e(album_drive_res);
  }
  const { drive_id: album_drive_id } = album_drive_res.data;
  //   const buffer = fs.readFileSync("/Users/litao/Downloads/for-buffer.png");
  // 保存 PNG 图片到文件
  //   const data_res = await drive.client.upload(buffer, {
  //     parent_file_id: "root",
  //     name: `${dayjs().unix()}.png`,
  //     drive_id: album_drive_id,
  //   });
  const images_res = await drive.client.fetch_images_in_folders();
  if (images_res.error) {
    return e(images_res);
  }
  const album_res = await drive.client.find_album("__flix_task");
  if (album_res.error) {
    return e(album_res);
  }
  const first_file = images_res.data.items[0];
  if (!first_file) {
    return e(Result.Err("没有图片文件"));
  }
  const data_res = await drive.client.save_files_to_album({
    file_id: first_file.file_id,
    album_id: album_res.data.album_id,
    drive_id: album_drive_id,
  });
  if (data_res.error) {
    return e(data_res);
  }
  const data = data_res.data;
  res.status(200).json({ code: 0, msg: "", data });
}
