import { config } from "dotenv";

import { Application } from "@/domains/application/index";
import { AliyunDriveClient } from "@/domains/clients/alipan/index";
import { BOJUDriveClient } from "@/domains/clients/boju_cc/index";
import { padding_zero, sleep } from "@/utils";

(async () => {
  config();
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  console.log("before", BOJUDriveClient, AliyunDriveClient);
  if (!BOJUDriveClient) {
    return;
  }
  const client = new BOJUDriveClient({ id: "", unique_id: BOJUDriveClient.URL, store });
  const r2 = await client.fetch_files("/v/388.html");
  if (r2.error) {
    console.log(r2.error.message);
    return;
  }
  const files = r2.data;
  console.log(files);
})();
