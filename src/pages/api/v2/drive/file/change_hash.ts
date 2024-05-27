/**
 * @file 文件洗码
 */
import fs from "fs";
import path from "path";

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import progress from "progress-stream";
import { execa } from "execa";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { Job, TaskTypes } from "@/domains/job/index";
import { response_error_factory } from "@/utils/server";
import { Result } from "@/types/index";
import { FileType, MediaResolutionTypes } from "@/constants/index";
import { bytes_to_size } from "@/utils/index";

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
  const source = await store.prisma.parsed_media_source.findFirst({
    where: {
      file_id: file.file_id,
    },
    include: {
      media_source: {
        include: {
          media: {
            include: {
              profile: true,
            },
          },
          profile: true,
        },
      },
    },
  });
  if (!source) {
    return e(Result.Err("该文件非影视剧文件，不支持洗码"));
  }
  const r2 = await drive.client.fetch_file(file.file_id);
  if (r2.error) {
    return e(r2);
  }
  const matched = r2.data;
  if (!matched.url) {
    return e(Result.Err("没有下载地址"));
  }
  let cur_progress = {
    transferred: 0,
    length: 0,
    percentage: 0,
    speed: 0,
  };
  let timer: NodeJS.Timer | null = null;
  let completed = false;
  const file_output_path = path.resolve(app.assets, file.name);
  (async () => {
    const writer = fs.createWriteStream(file_output_path);
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
      cur_progress = progress;
    });
    timer = setInterval(() => {
      if (completed) {
        if (timer) {
          clearInterval(timer);
        }
      }
      job.output.write_line([
        `Downloaded ${cur_progress.transferred} of ${cur_progress.length} bytes (${cur_progress.percentage}%)`,
      ]);
      job.output.write_line([`Speed: ${bytes_to_size(cur_progress.speed)} bytes/sec`]);
    }, 1000);
    response.data.pipe(progress_stream).pipe(writer);
    writer.on("finish", async () => {
      completed = true;
      if (timer) {
        clearInterval(timer);
      }
      job.output.write_line(["完成下载"]);
      job.output.write_line(["改变文件 hash"]);
      await execa`echo 0 >> ${file_output_path}`;
      job.output.write_line(["开始上传洗码后文件"]);
      const original_filename = path.parse(file_output_path);
      const result = await drive.client.upload(file_output_path, {
        name: [original_filename.name, ".洗码", original_filename.ext].join(""),
        parent_file_id: file.parent_file_id,
        on_progress(v) {
          console.log(v);
        },
      });
      if (result.error) {
        job.throw(new Error(`上传失败 ${result.error.message}`));
        return;
      }
      const uploaded_file = result.data;
      const r2 = await DriveAnalysis.New({
        drive,
        store,
        user,
        assets: app.assets,
        on_print(v) {
          job.output.write(v);
        },
        on_error(err) {
          job.throw(err);
        },
      });
      if (r2.error) {
        job.throw(new Error(`刮削失败 ${r2.error.message}`));
        return;
      }
      const analysis = r2.data;
      const the_files_prepare_analysis = [
        {
          file_id: uploaded_file.file_id,
          name: uploaded_file.file_name,
          type: FileType.File,
        },
      ];
      await analysis.run2(the_files_prepare_analysis, { force: true });
      job.output.write_line(["索引完成"]);
      job.finish();
    });
    writer.on("error", (err) => {
      completed = true;
      if (timer) {
        clearInterval(timer);
      }
      job.throw(new Error(`下载失败 ${err.message}`));
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
