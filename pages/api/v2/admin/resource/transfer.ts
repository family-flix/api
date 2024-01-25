/**
 * @file 转存分享资源到指定云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { Job } from "@/domains/job";
import { TaskTypes } from "@/domains/job/constants";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { ResourceSyncTaskStatus } from "@/constants";
import { store } from "@/store";
import { r_id, sleep } from "@/utils";

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
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  if (!drive.has_root_folder()) {
    return e(Result.Err("请先为云盘设置索引根目录"));
  }
  const exiting_tmp_file = await store.prisma.tmp_file.findFirst({
    where: {
      name: file_name,
      drive_id,
      user_id: user.id,
    },
  });
  if (exiting_tmp_file) {
    return e(Result.Err("最近转存过同名文件"));
  }
  const existing_file = await store.prisma.file.findFirst({
    where: {
      name: file_name,
      parent_paths: drive.profile.root_folder_name!,
      drive_id,
      user_id: user.id,
    },
  });
  if (existing_file) {
    return e(Result.Err("云盘内已有同名文件"));
  }
  const job_res = await Job.New({
    unique_id: file_id,
    desc: `转存资源「${file_name}」到云盘「${drive.name}」`,
    type: TaskTypes.Transfer,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  job.output.write_line(["开始转存"]);
  async function run(resource: { name: string; file_id: string; url: string; code?: string }) {
    const { url, code, file_id, name } = resource;
    drive.client.on_transfer_failed((error) => {
      job.output.write_line(["转存发生错误", error.message]);
    });
    drive.client.on_transfer_finish(async () => {
      job.output.write_line(["添加到待索引文件"]);
      await sleep(5000);
      const r = await drive.client.existing(drive.profile.root_folder_id!, name);
      if (r.error) {
        job.output.write_line(["搜索已转存文件失败", r.error.message]);
        return;
      }
      if (!r.data) {
        job.output.write_line(["转存后没有搜索到转存文件"]);
        return;
      }
      await store.prisma.tmp_file.create({
        data: {
          id: r_id(),
          name,
          file_id: r.data.file_id,
          parent_paths: drive.profile.root_folder_name ?? "",
          drive_id: drive.id,
          user_id: user.id,
        },
      });
      job.output.write_line(["创建同步任务"]);
      await store.prisma.resource_sync_task.create({
        data: {
          id: r_id(),
          url,
          pwd: code,
          file_id,
          name,
          status: ResourceSyncTaskStatus.WaitSetProfile,
          file_name_link_resource: name,
          file_id_link_resource: r.data.file_id,
          drive_id: drive.id,
          user_id: user.id,
        },
      });
    });
    (async () => {
      const e = await store.prisma.shared_file_in_progress.findFirst({
        where: {
          id: r_id(),
          url,
          user_id: user.id,
        },
      });
      if (e) {
        return;
      }
      await store.prisma.shared_file_in_progress.create({
        data: {
          id: r_id(),
          url,
          pwd: code,
          file_id,
          name,
          drive_id: drive.id,
          user_id: user.id,
        },
      });
    })();

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
    code,
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
