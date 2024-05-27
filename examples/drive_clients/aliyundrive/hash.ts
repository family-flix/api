import fs from "fs";
import path from "path";

import axios from "axios";
import progress from "progress-stream";

import { Application } from "@/domains/application/index";
import { Drive } from "@/domains/drive/v2";

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
  const r2 = await drive.client.fetch_file(file.file_id);
  if (r2.error) {
    console.log(r2.error.message);
    return;
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
    console.log("没有可下载的资源");
    return;
  }
  if (!matched.url) {
    console.log("没有下载地址");
    return;
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
      console.log("完成下载");
    });
    writer.on("error", (err) => {
      console.log("下载失败", err.message);
    });
  })();
}

main();
