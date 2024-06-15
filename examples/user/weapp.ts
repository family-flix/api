import { AliyunDriveClient } from "@/domains/clients/alipan/index";
import { Application } from "@/domains/application/index";
import { WeappClient } from "@/domains/user/weapp";
import { padding_zero, sleep } from "@/utils";

(async () => {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
    env: process.env,
    args: {},
  });
  const store = app.store;

  const $weapp = WeappClient({ app });
  const provider_id = "0a3BBy100YNZgS1QB1300hBNIT0BBy1f";
  const r1 = await $weapp.code2session(provider_id);
  if (r1.error) {
    console.log(r1.error.message);
    return;
  }
  const { openid, unionid, session_key } = r1.data;
  console.log(r1.data);
})();
