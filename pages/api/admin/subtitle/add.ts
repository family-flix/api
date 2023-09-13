/**
 * @file 上传字幕
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
import { ModelQuery } from "@/domains/store/types";
import { build_media_name } from "@/utils/parse_filename_for_video";

export const config = {
  api: {
    bodyParser: false,
  },
};
export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { episode_text, season_text, tv_id, drive_id, lang } = req.query as Partial<{
    tv_id: string;
    episode_text: string;
    season_text: string;
    drive_id: string;
    lang: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!tv_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  if (!episode_text) {
    return e(Result.Err("缺少剧集集数"));
  }
  if (!drive_id) {
    return e(Result.Err("请指定存入哪个云盘"));
  }
  if (!lang) {
    return e(Result.Err("请传入字幕语言"));
  }
  const where: ModelQuery<typeof store.prisma.episode.findFirst>["where"] = {
    tv_id,
    episode_text,
    season_text: "S01",
  };
  if (season_text) {
    where.season_text = season_text;
  }
  const episode = await store.prisma.episode.findFirst({
    where,
    include: {
      tv: {
        include: {
          profile: true,
        },
      },
      season: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (!episode) {
    return e(Result.Err("没有匹配的剧集记录"));
  }
  const files = (await new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      //       console.log("[ENDPOINT]episode/subtitle/add", fields);
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
  const file_buffer = fs.readFileSync(filepath);
  const correct_filename = filename || tmp_filename;
  const name_and_original_name = build_media_name(episode.tv.profile);
  const folder_res = await client.ensure_dir([
    "_flix_subtitles",
    [name_and_original_name, episode.season.season_text].filter(Boolean).join("."),
    episode.episode_text,
  ]);
  if (folder_res.error) {
    return e(folder_res);
  }
  const parent_folder = folder_res.data.pop();
  if (!parent_folder) {
    return e(Result.Err("创建字幕文件夹失败"));
  }
  const r = await client.upload(file_buffer, {
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
      episode_id: episode.id,
      drive_id,
      user_id: user.id,
    },
  });
  fs.unlinkSync(filepath);
  res.status(200).json({ code: 0, msg: "", data: null });
}
