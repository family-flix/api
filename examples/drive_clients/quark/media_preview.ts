import { Application } from "@/domains/application/index";
import { QuarkDriveClient } from "@/domains/clients/quark/index";

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
  const original_drive_res = await QuarkDriveClient.Get({ store });
  if (original_drive_res.error) {
    console.log(original_drive_res.error.message);
    return;
  }
  const original_client = original_drive_res.data;
  const file_id = "323221117509963205";
  const r = await original_client.fetch_video_preview_info(file_id);
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data);
  console.log("Completed");
})();
