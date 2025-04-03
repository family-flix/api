require("dotenv").config();
import { DriveAlistClient } from "@/domains/clients/alist/index";
import { Application } from "@/domains/application/index";
import { User } from "@/domains/user/index";

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
  const drive = new DriveAlistClient({
    id: "alist",
    unique_id: "http://127.0.0.1:5244",
    token: "",
    store,
  });

  //   const r4 = await drive.fetch_parent_paths("/115/downloads/庆余年第二季/22.mkv");
  const r4 = await drive.fetch_files("/115/downloads");
  if (r4.error) {
    console.log(r4.error.message);
    return;
  }
  const data = r4.data;
  console.log(data);
})();
