import path from "path";
import os from "os";

import { Application } from "@/domains/application";
import { LocalFileDriveClient } from "@/domains/clients/local";

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
  const dir = path.resolve(os.homedir(), "Documents");
  const drive_res = await LocalFileDriveClient.Get({ unique_id: dir });
  if (drive_res.error) {
    console.log(drive_res.error.message);
    return;
  }
  const client = drive_res.data;

  const filepath = path.resolve(os.homedir(), "Documents");
  const r = await client.fetch_file(filepath);
  //   const r = await client.fetch_files();
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data);
  console.log("Completed");
})();
