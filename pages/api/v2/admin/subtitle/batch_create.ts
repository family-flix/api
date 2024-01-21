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
import { MediaTypes, SubtitleFileTypes } from "@/constants";
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
  // const { media_id } = req.body as Partial<{ media_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { fields, files: files_form } = await formidable_promise(req, formidable_config);
  const media_id = fields.media_id[0];
  if (!media_id) {
    return e(Result.Err("缺少影视剧 id"));
  }
  const type = fields.type[0];
  if (!type) {
    return e(Result.Err("缺少媒体类型"));
  }
  const media = await store.prisma.media.findFirst({
    where: {
      id: media_id,
      type: Number(type),
      user_id: user.id,
    },
    include: {
      profile: true,
      media_sources: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (!media) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const payloads = fields.payloads.map((p) => {
    return JSON.parse(p);
  }) as {
    filename: string;
    episode_id: string;
    language: string;
  }[];
  const files = (() => {
    if (Number(type) === MediaTypes.Season) {
      return payloads.map((p) => {
        return files_form[p.episode_id][0];
      });
    }
    if (Number(type) === MediaTypes.Movie) {
      return files_form.files;
    }
    return [];
  })();
  if (files.length === 0) {
    return e(Result.Err("没有文件"));
  }
  const $upload = new FileUpload({ root: app.assets });
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
        // if (Number(type) === MediaTypes.Season) {
        const { episode_id, language } = payload;
        task.output.write_line([""]);
        task.output.write_line([prefix]);
        const media_source = await (async () => {
          if (Number(type) === MediaTypes.Season) {
            return store.prisma.media_source.findFirst({
              where: {
                id: episode_id,
              },
            });
          }
          if (Number(type) === MediaTypes.Movie) {
            return store.prisma.media_source.findFirst({
              where: {
                media_id,
              },
            });
          }
          return null;
        })();
        if (!media_source) {
          task.output.write_line(["没有匹配的剧集 ", episode_id]);
          return;
        }
        const correct_filename = filename || tmp_filename;
        const existing = await store.prisma.subtitle_v2.findFirst({
          where: {
            name: correct_filename,
            type: SubtitleFileTypes.LocalFile,
            language,
            media_source_id: media_source.id,
            user_id: user.id,
          },
        });
        if (existing) {
          task.output.write_line(["存在同名字幕文件"]);
          return;
        }
        const r = await $upload.upload_subtitle(filepath, correct_filename);
        if (r.error) {
          task.output.write_line(["上传字幕失败", r.error.message]);
          return;
        }
        await store.prisma.subtitle_v2.create({
          data: {
            id: r_id(),
            type: SubtitleFileTypes.LocalFile,
            unique_id: r.data,
            name: correct_filename,
            language,
            media_source_id: media_source.id,
            user_id: user.id,
          },
        });
        task.output.write_line(["上传成功"]);
        // fs.unlinkSync(filepath);
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
