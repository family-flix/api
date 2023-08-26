/**
 * @file 给剧集添加字幕
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
import { r_id } from "@/utils";
// import { parse_filename_for_video } from "@/utils/parse_filename_for_video";

export const config = {
  api: {
    bodyParser: false,
  },
};
export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { episode_id, drive_id, lang } = req.query as Partial<{
    episode_id: string;
    drive_id: string;
    lang: string;
  }>;
  if (!episode_id) {
    return e(Result.Err("缺少剧集 id"));
  }
  if (!drive_id) {
    return e(Result.Err("请指定存入哪个云盘"));
  }
  if (!lang) {
    return e(Result.Err("请传入字幕语言"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const episode_res = await store.find_episode({
    id: episode_id,
  });
  if (episode_res.error) {
    return e(episode_res);
  }
  const episode = episode_res.data;
  if (!episode) {
    return e(Result.Err("没有匹配的剧集记录"));
  }
  const files = (await new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      resolve(files.file);
    });
  })) as File[];
  const file = files[0];
  if (!file) {
    return e(Result.Err("缺少字幕文件"));
  }
  const drive_res = await Drive.Get({
    id: drive_id,
    user_id: user.id,
    store,
  });
  if (drive_res.error) {
    return;
  }
  const client = drive_res.data.client;

  const { filepath, originalFilename: filename, newFilename: tmp_filename } = file;
  const file_buffer = fs.readFileSync(filepath);
  const file_name = filename || tmp_filename;
  // console.log("upload", filepath, file_name);
  const r = await client.upload(file_buffer, {
    name: file_name,
    parent_file_id: "root",
  });
  if (r.error) {
    return e(r);
  }
  await store.prisma.subtitle.create({
    data: {
      id: r_id(),
      file_id: r.data.file_id,
      language: lang,
      episode_id,
      drive_id,
      user_id: user.id,
    },
  });
  fs.unlinkSync(filepath);
  res.status(200).json({ code: 0, msg: "", data: null });
}
