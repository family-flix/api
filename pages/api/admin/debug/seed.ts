/**
 * @file 转存一些文件到云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { Drive } from "@/domains/drive";
import { FileType } from "@/constants";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";
import { DriveAnalysis } from "@/domains/analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const job_res = await Job.New({
    unique_id: "debug/seed",
    type: TaskTypes.Other,
    desc: "给应用一些初始数据",
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run() {
    const resources_urls = [
      "https://www.aliyundrive.com/s/V9TfrFkCpAK",
      "https://www.aliyundrive.com/s/T6GbqewE8uA",
      "https://www.aliyundrive.com/s/NPDEACKs6cV",
      "https://www.aliyundrive.com/s/BbhnKieGxbg",
      "https://www.aliyundrive.com/s/BHkgbMNVmSM",
    ];
    const drive_res = await Drive.GetByUniqueId({ id: "622310670", user, store });
    if (drive_res.error) {
      return;
    }
    const drive = drive_res.data;
    const scopes: string[] = [];
    for (let i = 0; i < resources_urls.length; i += 1) {
      await (async () => {
        const url = resources_urls[i];
        job.output.write_line([url]);
        // drive.client.share_token = null;
        const profile_res = await drive.client.fetch_share_profile(url, { force: true });
        if (profile_res.error) {
          job.output.write_line(["获取资源详情失败，因为", profile_res.error.message]);
          return;
        }
        const { files } = profile_res.data;
        if (files.length !== 1) {
          job.output.write_line(["资源文件夹并非只有一个", JSON.stringify(files)]);
          return;
        }
        const { file_id, file_name } = files[0];
        scopes.push(file_name);
        job.output.write_line(["转存文件", file_name, file_id]);
        const r = await drive.client.save_multiple_shared_files({
          url,
          file_ids: [{ file_id }],
        });
        if (r.error) {
          job.output.write_line(["转存失败", r.error.message]);
          return;
        }
        job.output.write_line([file_name, "转存成功"]);
        await store.add_tmp_file({
          name: file_name,
          type: FileType.Folder,
          parent_paths: drive.profile.root_folder_name ?? "",
          drive_id: drive.id,
          user_id: user.id,
        });
      })();
    }
    const analysis_res = await DriveAnalysis.New({
      user,
      drive,
      store,
      assets: app.assets,
      on_print(v) {
        job.output.write(v);
      },
    });
    if (analysis_res.error) {
      job.output.write_line(["初始化索引失败", analysis_res.error.message]);
      return;
    }
    const analysis = analysis_res.data;
    job.output.write_line(["转存完成，开始索引新增文件"]);
    const r = await analysis.run(
      scopes.map((scope) => {
        return { name: [drive.profile.root_folder_name, scope].join("/"), type: "folder" };
      })
    );
    if (r.error) {
      job.output.write_line(["索引失败", r.error.message]);
    }
    job.finish();
  }
  run();
  res.status(200).json({ code: 0, msg: "开始", data: { job_id: job.id } });
}
