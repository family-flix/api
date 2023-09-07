/**
 * @file 批量上传字幕
 */
import fs from "fs";
import { Writable } from "stream";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";

import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { r_id } from "@/utils";
import { build_tv_name } from "@/utils/parse_filename_for_video";

export const config = {
  api: {
    bodyParser: false,
  },
};
const formidableConfig = {
  keepExtensions: true,
  maxFileSize: 10_000_000,
  maxFieldsSize: 10_000_000,
  maxFields: 100,
  allowEmptyFiles: false,
  multiples: true,
};
function formidablePromise(
  req: NextApiRequest,
  opts?: Parameters<typeof formidable>[0]
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((accept, reject) => {
    const form = formidable(opts);
    // form.addListener("file", (name, file) => {
    //   console.log("file in listen", name, file);
    // });
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      return accept({ fields, files });
    });
  });
}
const fileConsumer = <T = unknown>(acc: T[]) => {
  const writable = new Writable({
    write: (chunk, _enc, next) => {
      acc.push(chunk);
      next();
    },
  });

  return writable;
};
export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  // const chunks: never[] = [];
  const { fields, files: files_form } = await formidablePromise(req, {
    ...formidableConfig,
    // consume this, otherwise formidable tries to save the file to disk
    // fileWriteStreamHandler: () => {
    //   return fileConsumer(chunks);
    // },
  });
  const tv_id = fields.tv[0];
  const payloads = fields.payloads.map((p) => {
    return JSON.parse(p);
  }) as {
    filename: string;
    season_id: string;
    episode_id: string;
    language: string;
  }[];
  const drive_id = fields.drive[0];
  // console.log(tv_id, drive_id);
  // console.log(payloads);
  const files = payloads.map((p) => {
    return files_form[p.episode_id][0];
  });
  // console.log(files);
  if (!tv_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  if (!drive_id) {
    return e(Result.Err("请指定存入哪个云盘"));
  }
  const tv = await store.prisma.tv.findFirst({
    where: {
      id: tv_id,
      user_id: user.id,
    },
    include: {
      profile: true,
    },
  });
  if (!tv) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const drive_res = await Drive.Get({
    id: drive_id,
    user_id: user.id,
    store,
  });
  if (drive_res.error) {
    return e(drive_res);
  }
  const client = drive_res.data.client;
  for (let i = 0; i < files.length; i += 1) {
    await (async () => {
      const file = files[i];
      const { filepath, originalFilename: filename, newFilename: tmp_filename } = file;
      const payload = payloads.find((p) => {
        return p.filename === filename;
      });
      if (!payload) {
        return;
      }
      const { season_id, episode_id, language } = payload;
      const season_res = await store.find_season({ id: season_id });
      if (season_res.error) {
        return;
      }
      const season = season_res.data;
      if (!season) {
        return;
      }
      const episode_res = await store.find_episode({ id: episode_id });
      if (episode_res.error) {
        return;
      }
      const episode = episode_res.data;
      if (!episode) {
        return;
      }
      const file_buffer = fs.readFileSync(filepath);
      const correct_filename = filename || tmp_filename;
      const name_and_original_name = build_tv_name(tv.profile);
      const folder_res = await client.ensure_dir([
        "_flix_subtitles",
        [name_and_original_name, season.season_text].filter(Boolean).join("."),
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
          language,
          episode_id: episode.id,
          drive_id,
          user_id: user.id,
        },
      });
      fs.unlinkSync(filepath);
    })();
  }
  res.status(200).json({ code: 0, msg: "上传成功", data: null });
}
