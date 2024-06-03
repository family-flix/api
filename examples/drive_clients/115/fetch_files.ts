import { Drive115Client } from "@/domains/clients/115/index";
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
  const USER_ID = "101824580";
  const r2 = await Drive115Client.Get({ unique_id: USER_ID, store });
  if (r2.error) {
    console.log(r2.error.message);
    return;
  }
  const drive = r2.data;
  // const r3 = await drive.fetch_files();
  // if (r3.error) {
  //   console.log(r3.error.message);
  //   return;
  // }
  // const data = r3.data;
  const r3 = await drive.fetch_files("2910461134056949475");
  if (r3.error) {
    console.log(r3.error.message);
    return;
  }
  const data = r3.data;
  console.log(data);
})();
