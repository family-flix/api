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
    drive_id: id,
    file_id: folder_id,
    name,
    regexp,
    replace,
  } = req.body as Partial<{ drive_id: string; file_id: string; name: string; regexp: string; replace: string }>;
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
    desc: name ? `重命名「${name}」子文件列表` : "重命名子文件列表",
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
    const files_has_modify: Record<string, boolean> = {};
    await folder.walk(
      async (file) => {
        if (files_has_modify[file.id]) {
          return true;
        }
        const prefix = `[${file.name}]`;
        const reg = new RegExp(regexp);
        if (!file.name.match(reg)) {
          job.output.write_line([prefix, "不匹配，无需修改"]);
          return true;
        }
        const next_name = file.name.replace(
          reg,
          (() => {
            if (replace === "EMPTY") {
              return "";
            }
            return replace;
          })()
        );
        job.output.write_line([prefix, "新文件名是", next_name]);
        if (file.name === next_name) {
          job.output.write_line([prefix, "文件名已经是", next_name, "直接跳过"]);
          return true;
        }
        const r = await drive.rename_file(
          {
            file_id: file.id,
          },
          { name: next_name }
        );
        if (r.error) {
          job.output.write_line([prefix, "重命名失败，因为", r.error.message]);
          return true;
        }
        files_has_modify[file.id] = true;
        job.output.write_line([prefix, "重命名完成"]);
        return true;
      },
      { deep: false }
    );
    job.output.write_line(["所有文件重命名成功"]);
    job.finish();
  }
  run({
    regexp,
    replace,
  });
  res.status(200).json({ code: 0, msg: "重命名成功", data: { job_id: job.id } });
}
