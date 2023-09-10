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
import { TVProfileRecord, TVRecord } from "@/domains/store/types";
import { Job, TaskTypes } from "@/domains/job";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";

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
  const { tv_id, drive_id } = req.query as Partial<{ tv_id: string; drive_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
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
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const task_res = await Job.New({
    type: TaskTypes.UploadSubtitle,
    desc: `为 ${tv.profile.name} 上传字幕`,
    unique_id: tv_id,
    user_id: user.id,
    store,
  });
  if (task_res.error) {
    return e(task_res);
  }
  const task = task_res.data;
  const client = drive_res.data.client;
  const { fields, files: files_form } = await formidable_promise(req, formidable_config);
  const payloads = fields.payloads.map((p) => {
    return JSON.parse(p);
  }) as {
    filename: string;
    season_id: string;
    episode_id: string;
    language: string;
  }[];
  const files = payloads.map((p) => {
    return files_form[p.episode_id][0];
  });
  async function run(tv: TVRecord & { profile: TVProfileRecord }, drive_id: string) {
    for (let i = 0; i < files.length; i += 1) {
      await (async () => {
        const file = files[i];
        const { filepath, originalFilename: filename, newFilename: tmp_filename } = file;
        const prefix = [filename].join(".");
        const payload = payloads.find((p) => {
          return p.filename === filename;
        });
        task.output.write(
          new ArticleLineNode({
            children: [""].map((text) => new ArticleTextNode({ text })),
          })
        );
        task.output.write(
          new ArticleLineNode({
            children: [prefix].map((text) => new ArticleTextNode({ text })),
          })
        );
        if (!payload) {
          task.output.write(
            new ArticleLineNode({
              children: ["没有字幕信息"].map((text) => new ArticleTextNode({ text })),
            })
          );
          return;
        }
        const { season_id, episode_id, language } = payload;
        const season_res = await store.find_season({ id: season_id });
        if (season_res.error) {
          new ArticleLineNode({
            children: ["获取季失败"].map((text) => new ArticleTextNode({ text })),
          });
          return;
        }
        const season = season_res.data;
        if (!season) {
          task.output.write(
            new ArticleLineNode({
              children: ["没有匹配的季"].map((text) => new ArticleTextNode({ text })),
            })
          );
          return;
        }
        const episode_res = await store.find_episode({ id: episode_id });
        if (episode_res.error) {
          task.output.write(
            new ArticleLineNode({
              children: ["获取集失败"].map((text) => new ArticleTextNode({ text })),
            })
          );
          return;
        }
        const episode = episode_res.data;
        if (!episode) {
          task.output.write(
            new ArticleLineNode({
              children: ["没有匹配的集"].map((text) => new ArticleTextNode({ text })),
            })
          );
          return;
        }
        const correct_filename = filename || tmp_filename;
        const existing = await store.prisma.subtitle.findFirst({
          where: {
            name: correct_filename,
            episode_id: episode.id,
            language,
            drive_id,
            user_id: user.id,
          },
        });
        if (existing) {
          task.output.write(
            new ArticleLineNode({
              children: ["存在同名字幕文件"].map((text) => new ArticleTextNode({ text })),
            })
          );
          return;
        }
        const file_buffer = fs.readFileSync(filepath);
        const name_and_original_name = build_tv_name(tv.profile);
        const dir = [
          "_flix_subtitles",
          [name_and_original_name, season.season_text].filter(Boolean).join("."),
          episode.episode_text,
        ];
        const folder_res = await client.ensure_dir(dir);
        if (folder_res.error) {
          task.output.write(
            new ArticleLineNode({
              children: ["创建字幕文件夹", dir.join("/"), "失败"].map((text) => new ArticleTextNode({ text })),
            })
          );
          return;
        }
        const parent_folder = folder_res.data.pop();
        if (!parent_folder) {
          task.output.write(
            new ArticleLineNode({
              children: ["创建字幕文件夹", dir.join("/"), "失败"].map((text) => new ArticleTextNode({ text })),
            })
          );
          return;
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
        task.output.write(
          new ArticleLineNode({
            children: ["上传成功"].map((text) => new ArticleTextNode({ text })),
          })
        );
        fs.unlinkSync(filepath);
      })();
    }
    task.finish();
  }
  run(tv, drive_id);
  res.status(200).json({
    code: 0,
    msg: "开始上传",
    data: {
      job_id: task.id,
    },
  });
}
