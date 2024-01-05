/**
 * @file 批量上传字幕
 */
import fs from "fs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";

import { User } from "@/domains/user";
import { MediaProfileRecord, MediaRecord } from "@/domains/store/types";
import { Job, TaskTypes } from "@/domains/job";
import { FileUpload } from "@/domains/uploader";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils";
import { app, store } from "@/store";

export const config = {
  api: {
    bodyParser: false,
  },
};
const formidable_config = {
  keepExtensions: true,
  maxFileSize: 10_000_000,
  maxFieldsSize: 10_000_000,
  maxFields: 100,
  allowEmptyFiles: false,
  multiples: true,
};
function formidable_promise(
  req: NextApiRequest,
  opts?: Parameters<typeof formidable>[0]
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable(opts);
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      return resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id, drive_id } = req.query as Partial<{ media_id: string; drive_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  const media = await store.prisma.media.findFirst({
    where: {
      id: media_id,
      user_id: user.id,
    },
    include: {
      profile: true,
    },
  });
  if (!media) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const { fields, files: files_form } = await formidable_promise(req, formidable_config);
  const payloads = fields.payloads.map((p) => {
    return JSON.parse(p);
  }) as {
    filename: string;
    media_source_id: string;
    language: string;
  }[];
  const files = payloads.map((p) => {
    return files_form[p.media_source_id][0];
  });
  const task_res = await Job.New({
    type: TaskTypes.UploadSubtitle,
    desc: `为「${media.profile.name}」上传字幕`,
    unique_id: media_id,
    user_id: user.id,
    store,
  });
  if (task_res.error) {
    return e(Result.Err(task_res.error.message));
  }
  const task = task_res.data;
  async function run(media: MediaRecord & { profile: MediaProfileRecord }) {
    const $upload = new FileUpload({ root: app.assets });
    for (let i = 0; i < files.length; i += 1) {
      await (async () => {
        const file = files[i];
        const { filepath, originalFilename: filename, newFilename: tmp_filename } = file;
        const prefix = [filename].join(".");
        const payload = payloads.find((p) => {
          return p.filename === filename;
        });
        if (!payload) {
          task.output.write_line(["没有字幕信息"]);
          return;
        }
        const { media_source_id, language } = payload;
        task.output.write_line([""]);
        task.output.write_line([prefix]);
        const media_source = await store.prisma.media_source.findFirst({
          where: {
            id: media_source_id,
          },
        });
        if (!media_source) {
          task.output.write_line(["没有匹配的剧集"]);
          return;
        }
        const correct_filename = filename || tmp_filename;
        const existing = await store.prisma.subtitle_v2.findFirst({
          where: {
            name: correct_filename,
            media_source_id: media_source.id,
            language,
            user_id: user.id,
          },
        });
        if (existing) {
          task.output.write_line(["存在同名字幕文件"]);
          return;
        }
        const r = await $upload.upload_subtitle(filepath);
        if (r.error) {
          task.output.write_line(["上传字幕失败", r.error.message]);
          return;
        }
        await store.prisma.subtitle_v2.create({
          data: {
            id: r_id(),
            unique_id: r.data,
            name: correct_filename,
            language,
            media_source_id: media_source.id,
            user_id: user.id,
          },
        });
        task.output.write_line(["上传成功"]);
        fs.unlinkSync(filepath);
      })();
    }
    task.finish();
  }
  run(media);
  res.status(200).json({
    code: 0,
    msg: "开始上传",
    data: {
      job_id: task.id,
    },
  });
}
