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
import dayjs from "dayjs";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { Job, TaskTypes } from "@/domains/job/index";
import { response_error_factory } from "@/utils/server";
import { Result } from "@/domains/result/index";
import { FileType, MediaResolutionTypes, MediaTypes } from "@/constants/index";
import { bytes_to_size } from "@/utils/index";
import { build_media_name } from "@/utils/parse_filename_for_video";
import { check_existing } from "@/utils/fs";

export default async function v2_admin_drive_file_change_hash(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id, file_id } = req.body as Partial<{ drive_id: string; file_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少 file_id 参数"));
  }
  const file = await store.prisma.file.findFirst({
    where: {
      file_id,
      user_id: user.id,
    },
  });
  if (!file) {
    return e(Result.Err("没有匹配的记录"));
  }
  const r = await Drive.Get({ id: drive_id || file.drive_id, store });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const drive = r.data;
  const source = await store.prisma.parsed_media_source.findFirst({
    where: {
      file_id: file.file_id,
    },
    include: {
      media_source: {
        include: {
          media: {
            include: {
              profile: {
                include: {
                  series: true,
                },
              },
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
  if (!source.media_source) {
    return e(Result.Err("暂时仅支持影视剧文件洗码"));
  }
  const media_record = source.media_source.media;
  const media_profile_record = media_record.profile;
  const media = {
    type: media_record.type,
    name: media_profile_record.series ? media_profile_record.series.name : media_profile_record.name,
    original_name: media_profile_record.original_name,
    season: media_profile_record.order,
    air_date: media_profile_record.air_date,
    episode: source.media_source.profile.order,
  };
  const r0 = await (async () => {
    const r3 = await drive.client.download(file.file_id);
    if (r3.error) {
      return r3;
    }
    if (r3.data.url) {
      return Result.Ok(r3.data);
    }
    const r2 = await drive.client.fetch_file(file.file_id);
    if (r2.error) {
      return r2;
    }
    const matched = r2.data;
    if (matched.url) {
      return Result.Ok(matched);
    }
    return Result.Err("没有下载地址");
  })();
  if (r0.error) {
    return e(r0);
  }
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
  drive.client.on_print((v) => {
    job.output.write(v);
  });
  const matched = r0.data;
  const file_output_path = path.resolve(app.assets, file.name);
  (async () => {
    const rrr = await download({
      source_url: matched.url,
      output: file_output_path,
      on_progress(cur_progress) {
        if (cur_progress.text) {
          job.output.write_line([cur_progress.text]);
        }
        job.output.write_line([
          `Downloaded ${bytes_to_size(cur_progress.transferred)} of ${bytes_to_size(cur_progress.length)} (${
            cur_progress.percentage
          }%)`,
        ]);
        job.output.write_line([`Speed: ${bytes_to_size(cur_progress.speed)} /sec`]);
      },
    });
    if (rrr.error) {
      job.throw(new Error(`下载失败 ${rrr.error.message}`));
      return;
    }
    job.output.write_line(["完成下载"]);
    job.output.write_line(["改变文件 hash"]);
    await execa("echo", ["0", ">>", file_output_path], { shell: true });
    job.output.write_line(["开始上传洗码文件"]);
    const original_filename = path.parse(file_output_path);
    const new_file_name = [original_filename.name, "洗码"].filter(Boolean).join(".") + original_filename.ext;
    const result = await drive.client.upload(file_output_path, {
      name: new_file_name,
      parent_file_id: file.parent_file_id,
    });
    if (result.error) {
      job.throw(new Error(`上传失败 ${result.error.message}`));
      return;
    }
    job.output.write_line(["完成上传，开始索引"]);
    fs.unlinkSync(file_output_path);
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
      job.throw(new Error(`索引失败 ${r2.error.message}`));
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
  })();
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      job_id: job.id,
    },
  });
}

function download(opt: {
  source_url: string;
  output: string;
  on_progress?: (data: {
    transferred: number;
    length: number;
    percentage: number;
    speed: number;
    text: string;
  }) => void;
}): Promise<Result<{ filepath: string }>> {
  const { source_url, output, on_progress } = opt;
  let cur_progress = {
    transferred: 0,
    length: 0,
    percentage: 0,
    speed: 0,
    text: "",
  };
  let timer: NodeJS.Timer | null = null;
  let completed = false;
  return new Promise(async (resolve) => {
    const rr = await check_existing(output);
    if (rr.data) {
      if (on_progress) {
        on_progress({
          transferred: 0,
          length: 0,
          percentage: 0,
          speed: 0,
          text: "文件已存在",
        });
      }
      resolve(Result.Ok({ filepath: output }));
      return;
    }
    const writer = fs.createWriteStream(output);
    const response = await axios.get(source_url, {
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
      const { transferred, length, percentage, speed } = progress;
      cur_progress = {
        transferred,
        length,
        percentage,
        speed,
        text: "",
      };
    });
    timer = setInterval(() => {
      if (completed) {
        if (timer) {
          clearInterval(timer);
        }
      }
      if (on_progress) {
        on_progress(cur_progress);
      }
    }, 5000);
    response.data.pipe(progress_stream).pipe(writer);
    writer.on("finish", async () => {
      completed = true;
      if (timer) {
        clearInterval(timer);
      }
      resolve(
        Result.Ok({
          filepath: output,
        })
      );
    });
    writer.on("error", (err) => {
      completed = true;
      if (timer) {
        clearInterval(timer);
      }
      resolve(Result.Err(err.message));
    });
  });
}
