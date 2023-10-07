/**
 * @file 转存分享文件到指定网盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { Job } from "@/domains/job";
import { TaskTypes } from "@/domains/job/constants";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { BaseApiResp, Result } from "@/types";
import { FileType } from "@/constants";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url, code, file_id, file_name, drive_id } = req.body as Partial<{
    /** 分享资源链接 */
    url: string;
    /** 分享资源密码 */
    code: string;
    /** 要转存的分享文件的 file_id */
    file_id: string;
    /** 要转存的分享文件的名称 */
    file_name: string;
    /** 转存到哪个云盘 */
    drive_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!url) {
    return e(Result.Err("缺少分享资源链接"));
  }
  if (!file_id) {
    return e(Result.Err("请指定要转存的文件"));
  }
  if (!file_name) {
    return e(Result.Err("请传入转存文件名称"));
  }
  if (!drive_id) {
    return e(Result.Err("请指定转存到哪个网盘"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (!drive.has_root_folder()) {
    return e(Result.Err("请先为云盘设置索引根目录"));
  }
  const exiting_tmp_file_res = await store.find_tmp_file({
    name: file_name,
    drive_id,
    user_id: user.id,
  });
  if (exiting_tmp_file_res.data) {
    return e(Result.Err("最近转存过同名文件"));
  }
  const existing_file_res = await store.find_file({
    name: file_name,
    parent_paths: drive.profile.root_folder_name!,
    drive_id,
    user_id: user.id,
  });
  if (existing_file_res.data) {
    return e(Result.Err("云盘内已有同名文件"));
  }
  const job_res = await Job.New({
    unique_id: file_id,
    desc: `转存资源 '${file_name}' 到云盘 '${drive.name}'`,
    type: TaskTypes.Transfer,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  job.output.write_line(["开始转存"]);
  async function run(resource: { name: string; file_id: string; url: string }) {
    const { url, file_id, name } = resource;
    drive.client.on_transfer_failed((error) => {
      job.output.write_line(["转存发生错误", error.message]);
    });
    drive.client.on_transfer_finish(async () => {
      job.output.write_line(["添加到待索引文件"]);
      await store.add_tmp_file({
        name,
        type: FileType.Folder,
        parent_paths: drive.profile.root_folder_name ?? "",
        drive_id,
        user_id: user.id,
      });
      job.output.write_line(["添加转存记录列表"]);
      await store.add_shared_file_save({
        url,
        file_id,
        name,
        drive_id,
        user_id: user.id,
      });
    });
    const r = await drive.client.save_multiple_shared_files({
      url,
      code,
      file_ids: [{ file_id }],
    });
    if (r.error) {
      job.output.write(
        new ArticleLineNode({
          children: ["转存失败", r.error.message].map((text) => new ArticleTextNode({ text })),
        })
      );
      job.finish();
      return;
    }
    job.output.write(
      new ArticleLineNode({
        children: ["转存成功"].map((text) => new ArticleTextNode({ text })),
      })
    );
    job.finish();
  }
  run({
    url,
    file_id,
    name: file_name,
  });
  res.status(200).json({
    code: 0,
    msg: "开始转存",
    data: {
      job_id: job.id,
    },
  });
}
