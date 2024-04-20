import os from "os";
import path from "path";

import { Application } from "@/domains/application";
import { QuarkDriveClient } from "@/domains/clients/quark";

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
  const drive_res = await QuarkDriveClient.Get({
    unique_id: "",
    // user,
    store,
  });
  if (drive_res.error) {
    console.log(drive_res.error.message);
    return;
  }
  const client = drive_res.data;
  // const r = await client.login({ pwd: "Li1218040201." });
  // if (r.error) {
  //   console.log(r.error.message);
  //   return;
  // }
  const r2 = await client.fetch_file("123201117619517454");
  if (r2.error) {
    console.log(r2.error.message);
    return;
  }
  console.log(r2.data);
  console.log("Completed");
})();
