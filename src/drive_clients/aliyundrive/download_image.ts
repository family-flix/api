import { AliyunDriveClient } from "@/domains/clients/alipan/index";
import { Application } from "@/domains/application/index";
import { padding_zero, sleep } from "@/utils";

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
  const r = await AliyunDriveClient.Get({ unique_id: "880986603", store });
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  const client = r.data;
  const r2 = await client.download("65d8412f61db4204c1154920add37e69311d91b4");
  if (r2.error) {
    console.log(r2.error.message);
    return;
  }
  const content = r2.data;
  console.log(content);
})();
