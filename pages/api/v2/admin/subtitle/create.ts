/**
 * @file 上传字幕
 */
import fs from "fs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { File, IncomingForm } from "formidable";

import { app, store } from "@/store/index";
import { User } from "@/domains/user/index";
import { ModelQuery } from "@/domains/store/types";
import { FileManage } from "@/domains/uploader/index";
import { BaseApiResp, Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_source_id, lang } = req.query as Partial<{
    media_source_id: string;
    season_text: string;
    lang: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_source_id) {
    return e(Result.Err("请指定字幕关联剧集"));
  }
  if (!lang) {
    return e(Result.Err("请传入字幕语言"));
  }
  const where: ModelQuery<"media_source"> = {
    id: media_source_id,
    user_id: user.id,
  };
  const media_source = await store.prisma.media_source.findFirst({
    where,
  });
  if (!media_source) {
    return e(Result.Err("没有匹配的视频记录"));
  }
  const $upload = new FileManage({ root: app.assets });
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
  const { filepath, originalFilename: filename, newFilename: tmp_filename } = file;
  // const file_buffer = fs.readFileSync(filepath);
  const correct_filename = filename || tmp_filename;
  const r = await $upload.upload_subtitle(filepath, correct_filename);
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  await store.prisma.subtitle_v2.create({
    data: {
      id: r_id(),
      unique_id: r.data,
      name: correct_filename,
      language: lang,
      user_id: user.id,
    },
  });
  fs.unlinkSync(filepath);
  res.status(200).json({ code: 0, msg: "", data: null });
}
