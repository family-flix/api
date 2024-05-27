/**
 * @file 文件洗码
 */
import fs from "fs";
import path from "path";

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import progress from "progress-stream";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { Job, TaskTypes } from "@/domains/job/index";
import { response_error_factory } from "@/utils/server";
import { Result } from "@/types/index";
import { MediaResolutionTypes } from "@/constants/index";

export default async function v2_admin_drive_file_change_hash(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const file = await store.prisma.file.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!file) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { drive_id } = file;
  const r = await Drive.Get({ id: drive_id, store });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const drive = r.data;
  const job_res = await Job.New({
    desc: `改变文件「${file.name}」hash`,
    type: TaskTypes.DeleteDriveFile,
    unique_id: drive.id,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const r2 = await drive.client.download(file.file_id);
  if (r2.error) {
    return e(r2);
  }
  const matched = r2.data;
  // const matched = (() => {
  //   let m = r2.data.sources.find((s) => s.type === MediaResolutionTypes.FHD);
  //   if (m) {
  //     return m;
  //   }
  //   m = r2.data.sources.find((s) => s.type === MediaResolutionTypes.HD);
  //   if (m) {
  //     return m;
  //   }
  //   return r2.data.sources[0];
  // })();
  if (!matched) {
    return e(Result.Err("没有可下载的资源"));
  }
  if (!matched.url) {
    return e(Result.Err("没有下载地址"));
  }
  (async () => {
    const writer = fs.createWriteStream(path.resolve(app.assets, file.name));
    const response = await axios.get(matched.url, {
      responseType: "stream",
      headers: {
        Referer: "https://www.alipan.com/",
      },
    });
    const total_length = response.headers["content-length"];
    console.log("Total file size:", total_length);
    const progress_stream = progress({
      length: total_length,
      time: 100 /* ms */,
    });
    progress_stream.on("progress", (progress) => {
      console.log(`Downloaded ${progress.transferred} of ${progress.length} bytes (${progress.percentage}%)`);
      console.log(`Speed: ${progress.speed} bytes/sec`);
    });
    response.data.pipe(progress_stream).pipe(writer);
    writer.on("finish", () => {
      job.finish();
    });
    writer.on("error", (err) => {
      job.throw(err);
    });
  })();
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      job_id: job.id,
    },
  });
}
