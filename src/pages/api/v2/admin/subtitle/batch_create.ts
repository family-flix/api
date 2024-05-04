/**
 * @file 批量上传字幕
 */
import fs from "fs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Job, TaskTypes } from "@/domains/job/index";
import { FileManage } from "@/domains/uploader";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { MediaTypes, SubtitleFileTypes } from "@/constants/index";
import { r_id } from "@/utils/index";

export default async function v2_admin_subtitle_batch_create(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    type,
    media_id,
    files: body_files,
    payloads: body_payloads,
  } = req.body as Partial<{
    type: string;
    media_id: string;
    files: File[];
    payloads: string[];
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少影视剧 id"));
  }
  console.log('files', body_files);
  if (!body_files) {
    return e(Result.Err("缺少上传的文件"));
  }
  if (body_files.length === 0) {
    return e(Result.Err("没有文件"));
  }
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
    return e(Result.Err("没有匹配的影视剧记录"));
  }
  const payloads = (() => {
    if (!body_payloads) {
      return [];
    }
    const p = Array.isArray(body_payloads) ? body_payloads : [body_payloads];
    return p.map((p) => {
      return JSON.parse(p);
    }) as {
      filename: string;
      episode_id?: string;
      language: string;
    }[];
  })();
  if (payloads.length === 0) {
    return e(Result.Err("缺少 payloads 参数"));
  }
  // const files = (() => {
  //   if (Number(type) === MediaTypes.Season) {
  //     return payloads.map((p) => {
  //       return files_form[p.episode_id][0];
  //     });
  //   }
  //   if (Number(type) === MediaTypes.Movie) {
  //     return files_form.files;
  //   }
  //   return [];
  // })();
  const $upload = new FileManage({ root: app.assets });
  const task_res = await Job.New({
    type: TaskTypes.UploadSubtitle,
    desc: `为「${media.profile.name}」上传字幕`,
    unique_id: media_id,
    user_id: user.id,
    app,
    store,
  });
  if (task_res.error) {
    return e(Result.Err(task_res.error.message));
  }
  const task = task_res.data;
  async function run(files: File[]) {
    task.output.write_line(["共", String(files.length), "个字幕文件"]);
    for (let i = 0; i < files.length; i += 1) {
      await (async () => {
        const file = files[i];
        const { name } = file;
        task.output.write_line(["第", i + 1, "个 ", name]);
        const prefix = [name].join(".");
        const payload = payloads.find((p) => {
          return p.filename === name;
        });
        if (!payload) {
          task.output.write_line(["没有字幕信息"]);
          return;
        }
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
        const correct_filename = name;
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
        const r = await $upload.upload_subtitle_v2(file, correct_filename);
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
  run(body_files);
  return res.status(200).json({
    code: 0,
    msg: "开始上传",
    data: {
      job_id: task.id,
    },
  });
}
