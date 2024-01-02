/**
 * @file 重命名指定文件的所有子文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive/v2";
import { Folder } from "@/domains/folder";
import { Job, TaskTypes } from "@/domains/job";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    id,
    file_id: folder_id,
    regexp,
    replace,
  } = req.body as Partial<{ id: string; file_id: string; regexp: string; replace: string }>;
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
    return e(Result.Err(drive_res.error.message));
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
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  const folder = new Folder(folder_id, {
    client: drive.client,
  });
  async function run(parent: { regexp: string; replace: string }) {
    const { regexp, replace } = parent;
    job.output.write_line(["开始重命名"]);
    let error_count = 0;
    do {
      if (error_count >= 6) {
        // 文件列表请求失败超过6次就中断
        folder.next_marker = "";
      }
      await (async () => {
        const r = await folder.next();
        if (r.error) {
          job.output.write_line(["请求失败", r.error.message]);
          error_count += 1;
          return;
        }
        const result = r.data;
        if (!result) {
          job.output.write_line(["没有文件"]);
          error_count += 1;
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
            const r = await drive.rename_file(
              {
                file_id: file.id,
              },
              { name: next_name }
            );
            if (r.error) {
              job.output.write_line([prefix, "重命名失败，因为", r.error.message]);
              return;
            }
            job.output.write_line([prefix, "重命名完成"]);
          })();
        }
      })();
    } while (folder.next_marker);
    job.output.write_line(["重命名成功"]);
    job.finish();
  }
  run({
    regexp,
    replace,
  });
  res.status(200).json({ code: 0, msg: "重命名成功", data: { job_id: job.id } });
}
