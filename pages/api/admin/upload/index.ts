/**
 * @file 上传文件
 */
import fs from "fs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { File, IncomingForm } from "formidable";

import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export const config = {
  api: {
    bodyParser: false,
  },
};
export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id } = req.query as Partial<{ drive_id: string }>;
  if (!drive_id) {
    return e(Result.Err("请指定上传至哪个云盘"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const files = (await new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      resolve(files.file);
    });
  })) as File[];
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return;
  }
  const client = drive_res.data.client;
  const file = files[0];
  if (!file) {
    return e(Result.Err("没有文件"));
  }
  const { filepath, originalFilename: filename, newFilename: tmp_filename } = file;
  const file_buffer = fs.readFileSync(filepath);
  const correct_filename = filename || tmp_filename;
  // console.log("upload", filepath, file_name);
  const r = await client.upload(file_buffer, {
    name: correct_filename,
    parent_file_id: "root",
  });
  if (r.error) {
    return e(r);
  }
  fs.unlinkSync(filepath);
  res.status(200).json({ code: 0, msg: "上传成功", data: null });
}
