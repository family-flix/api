/**
 * @file 重命名指定文件的所有子文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { DriveAnalysis } from "@/domains/analysis";
import { Drive } from "@/domains/drive";
import { Folder } from "@/domains/folder";
import { Job, TaskTypes } from "@/domains/job";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, file_id: folder_id } = req.query as Partial<{ id: string; file_id: string }>;
  const { regexp, replace } = req.body as Partial<{ regexp: string; replace: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!folder_id) {
    return e(Result.Err("缺少文件 file_id"));
  }
  if (!regexp) {
    return e(Result.Err("缺少正则"));
  }
  if (!replace) {
    return e(Result.Err("缺少替换内容"));
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const job_res = await Job.New({
    unique_id: [id, folder_id].join("/"),
    desc: "重命名子文件列表",
    type: TaskTypes.RenameFiles,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const folder = new Folder(folder_id, {
    client: drive.client,
  });
  async function run(parent: { file_id: string; regexp: string; replace: string }) {
    const { file_id: parent_file_id, regexp, replace } = parent;
    job.output.write_line(["开始重命名"]);
    let count = 0;
    do {
      if (count >= 6) {
        // 文件列表请求失败超过6次就中断
        folder.next_marker = "";
      }
      await (async () => {
        const r = await folder.next();
        if (r.error) {
          job.output.write_line(["请求失败", r.error.message]);
          count += 1;
          return;
        }
        const result = r.data;
        if (!result) {
          job.output.write_line(["没有文件"]);
          count += 1;
          return;
        }
        for (let i = 0; i < result.length; i += 1) {
          await (async () => {
            const file = result[i];
            const prefix = `[${file.name}]`;
            const next_name = file.name.replace(new RegExp(regexp), replace);
            job.output.write_line([prefix, "新文件名是", next_name]);
            if (file.name === next_name) {
              job.output.write_line([prefix, "文件名已经是", next_name, "直接跳过"]);
              return;
            }
            const file_record = await store.prisma.file.findFirst({
              where: {
                file_id: file.id,
              },
            });
            if (!file_record) {
              job.output.write_line([prefix, "文件未索引，修改云盘实际文件即可"]);
              const r = await drive.client.rename_file(file.id, next_name);
              if (r.error) {
                job.output.write_line([prefix, "修改云盘文件失败", r.error.message]);
                return;
              }
              return;
            }
            job.output.write_line([prefix, "修改云盘文件及解析结果"]);
            const r = await drive.rename_file(file_record, { name: next_name });
            if (r.error) {
              job.output.write_line([prefix, "重命名失败，因为 ", r.error.message]);
              return;
            }
            job.output.write_line([prefix, "重命名成功"]);
          })();
        }
      })();
    } while (folder.next_marker);
    const file = await store.prisma.file.findFirst({
      where: {
        file_id: parent_file_id,
        user_id: user.id,
      },
    });
    if (!file) {
      job.finish();
      return;
    }
    const analysis_res = await DriveAnalysis.New({
      assets: app.assets,
      user,
      drive,
      store,
      on_print(v) {
        job.output.write(v);
      },
    });
    if (analysis_res.error) {
      job.output.write_line(["初始化云盘索引失败"]);
      job.finish();
      return;
    }
    const analysis = analysis_res.data;
    const r2 = await analysis.run([
      {
        name: [file.parent_paths, file.name].join("/"),
        type: "file",
      },
    ]);
    if (r2.error) {
      job.output.write_line(["索引失败"]);
      job.finish();
      return;
    }
    job.output.write_line(["重命名并索引成功"]);
    job.finish();
  }
  run({
    file_id: folder_id,
    regexp,
    replace,
  });
  res.status(200).json({ code: 0, msg: "重命名成功", data: { job_id: job.id } });
}
