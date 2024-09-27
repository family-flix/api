import { Application } from "@/domains/application";
import { Notify } from "@/domains/notify";
import { PushClientTypes } from "@/domains/notify/constants";

async function main() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const token = process.env.WXPUSH_TOKEN;
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  const t1 = await Notify.New({ type: PushClientTypes.WXPush, token, store });
  if (t1.error) {
    console.log(t1.error.message);
    return;
  }
  const notify = t1.data;
  const r = await notify.send({
    text: "想看「指环王」",
  });
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log("Push success");
}

main();
