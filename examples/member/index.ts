import { AliyunDriveClient } from "@/domains/clients/alipan/index";
import { Application } from "@/domains/application/index";
import { WeappClient } from "@/domains/user/weapp";
import { padding_zero, sleep } from "@/utils";
import { Member } from "@/domains/user/member";

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

  const token =
    "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..BlTpJklKzJcbWpMg.VJ1RxQ7FoPLefTfPbVCP2ZWBtEb0dOcVtYKZx9pBDwlxbn1FpME0DcUHQIDKwVPA-SXerrfSArA4nrjcHQGAUZ5mTrArJvbLZirxlndHWXaRrk2WTWg.b_Th8IXsmVU6grff6-g0Fg";
  const r = await Member.New(token, store);
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data.nickname);
})();
