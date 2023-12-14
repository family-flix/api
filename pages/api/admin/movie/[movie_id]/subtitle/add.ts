/**
 * @file 给电影添加字幕
 */
import fs from "fs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { File, IncomingForm } from "formidable";

import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { r_id } from "@/utils";

export const config = {
  api: {
    bodyParser: false,
  },
};
export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { movie_id, drive_id, lang } = req.query as Partial<{
    movie_id: string;
    drive_id: string;
    lang: string;
  }>;
  if (!movie_id) {
    return e(Result.Err("缺少电影 id"));
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
  const movie = await store.prisma.movie.findFirst({
    where: {
      id: movie_id,
    },
    include: {
      profile: true,
    },
  });
  if (!movie) {
    return e(Result.Err("没有匹配的电影记录"));
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
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const client = drive_res.data.client;
  const { filepath, originalFilename: filename, newFilename: tmp_filename } = file;
  const correct_filename = filename || tmp_filename;
  // console.log("upload", filepath, file_name);
  const parent_file_id = "root";
  const existing_res = await client.existing(parent_file_id, correct_filename);
  if (existing_res.error) {
    return e(existing_res);
  }
  if (existing_res.data) {
    return e(Result.Err("该文件已存在"));
  }
  // const file_buffer = fs.readFileSync(filepath);
  const folder_res = await client.ensure_dir([
    "_flix_subtitles",
    [movie.profile.name, movie.profile.original_name, movie.profile.air_date].filter(Boolean).join("."),
  ]);
  if (folder_res.error) {
    return e(folder_res);
  }
  const parent_folder = folder_res.data.pop();
  if (!parent_folder) {
    return e(Result.Err("创建字幕文件夹失败"));
  }
  const r = await client.upload(filepath, {
    name: correct_filename,
    parent_file_id: parent_folder.file_id,
  });
  if (r.error) {
    return e(r);
  }
  await store.prisma.subtitle.create({
    data: {
      id: r_id(),
      file_id: r.data.file_id,
      name: correct_filename,
      language: lang,
      movie_id,
      drive_id,
      user_id: user.id,
    },
  });
  //   fs.unlinkSync(filepath);
  res.status(200).json({ code: 0, msg: "", data: null });
}
