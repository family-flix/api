import os from "os";
import path from "path";

import { Application } from "@/domains/application";
import { QuarkDriveClient } from "@/domains/clients/quark";

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
  const drive_res = await QuarkDriveClient.Get({ unique_id: "0ae08de8-9fa3-cde8-b24b-148f3c20a3dd", store });
  if (drive_res.error) {
    console.log(drive_res.error.message);
    return;
  }
  const client = drive_res.data;
  const r = await client.fetch_file("d1d62de0e870466ab94c4fe16188bcdd");
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data);
  console.log("Completed");
})();
