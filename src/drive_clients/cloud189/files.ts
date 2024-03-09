import os from "os";
import path from "path";

import { Application } from "@/domains/application/index";
import { Cloud189DriveClient } from "@/domains/clients/cloud189/index";

// {{baseURL}}/api/v2/aliyundrive/file_tree_of_resource?url=https://www.aliyundrive.com/s/48ocrDyEoj2&file_id=63723df732d9e8290475469ba8ea46efbd498bed&name=C 重返1993 第三季 [2023][1-3]
const data = {};

(async () => {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  const drive_res = await Cloud189DriveClient.Get({ unique_id: "13282844700", store });
  if (drive_res.error) {
    console.log(drive_res.error.message);
    return;
  }
  const client = drive_res.data;
  // const r = await client.fetch_files("-11");
  // const r = await client.fetch_parent_paths("224621117483575724");
  // const r = await client.fetch_file("224621117483575724");
  const r = await client.fetch_file("123201117619517454");
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data);
  console.log("Completed");
})();
