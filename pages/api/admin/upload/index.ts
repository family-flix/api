/**
 * @file 上传文件
 */
import fs from "fs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { File, IncomingForm } from "formidable";

import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
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
  const drive_res = await Drive.Get({
    id: "O2wsuqkBwNehfXe",
    user_id: user.id,
    store,
  });
  if (drive_res.error) {
    return;
  }
  const client = drive_res.data.client;
  // const filepath = "/Users/litao/Desktop/example2.png";
  // const file_buffer = fs.readFileSync(filepath);
  // const file_name = "example10.png";
  // await client.upload(file_buffer, {
  //   name: file_name,
  //   parent_file_id: "root",
  // });
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const { filepath, originalFilename: filename, newFilename: tmp_filename } = file;
    const file_buffer = fs.readFileSync(filepath);
    const file_name = filename || tmp_filename;
    // console.log("upload", filepath, file_name);
    await client.upload(file_buffer, {
      name: file_name,
      parent_file_id: "root",
    });
    fs.unlinkSync(filepath);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
