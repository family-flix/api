import fs from "fs";
import path from "path";

import axios from "axios";
import progress from "progress-stream";
import { execa } from "execa";

import { Application } from "@/domains/application/index";
import { Drive } from "@/domains/drive/v2";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { bytes_to_size } from "@/utils/index";
import { FileType } from "@/constants/index";

async function main() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  const id = "6653ed683c6f5786a318403f851a61db56867f1c";
  const file = await store.prisma.file.findFirst({
    where: {
      id,
    },
  });
  if (!file) {
    console.log("没有匹配的记录");
    return;
  }
  const { drive_id } = file;
  const r = await Drive.Get({ id: drive_id, store });
  if (r.error) {
    console.log(r.error.message);
    return;
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
              profile: true,
            },
          },
          profile: true,
        },
      },
    },
  });
  if (!source) {
    console.log("该文件非影视剧文件，不支持洗码");
    return;
  }
  const r2 = await drive.client.fetch_file(file.file_id);
  if (r2.error) {
    console.log(r2.error.message);
    return;
  }
  const matched = r2.data;
  if (!matched.url) {
    console.log("没有下载地址");
    return;
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
      console.log(
        `Downloaded ${cur_progress.transferred} of ${cur_progress.length} bytes (${cur_progress.percentage}%)`
      );
      console.log(`Speed: ${bytes_to_size(cur_progress.speed)} bytes/sec`);
    }, 1000);
    response.data.pipe(progress_stream).pipe(writer);
    writer.on("finish", async () => {
      completed = true;
      if (timer) {
        clearInterval(timer);
      }
      console.log("完成下载");
      console.log("改变 hash");
      await execa`echo 0 >> ${file_output_path}`;
      console.log("开始上传");
      const original_filename = path.parse(file_output_path);
      const result = await drive.client.upload(file_output_path, {
        name: [original_filename.name, ".洗码", original_filename.ext].join(""),
        parent_file_id: file.parent_file_id,
        on_progress(v) {
          console.log(v);
        },
      });
      if (result.error) {
        console.log("上传失败", result.error.message);
        return;
      }
      const uploaded_file = result.data;
//       const r2 = await DriveAnalysis.New({
//         drive,
//         store,
//         user,
//         assets: app.assets,
//         on_print(v) {
//           job.output.write(v);
//         },
//         on_error() {
//           job.finish();
//         },
//       });
//       if (r2.error) {
//         return;
//       }
//       const analysis = r2.data;
//       const the_files_prepare_analysis = [
//         {
//           file_id: uploaded_file.file_id,
//           name: uploaded_file.file_name,
//           type: FileType.File,
//         },
//       ];
//       await analysis.run2(the_files_prepare_analysis, { force: true });
//       job.output.write_line(["索引完成"]);
//       job.finish();
    });
    writer.on("error", (err) => {
      completed = true;
      if (timer) {
        clearInterval(timer);
      }
      console.log("下载失败", err.message);
    });
  })();
}

main();
