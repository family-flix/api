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
//   const u = await store.prisma.user.findFirst({});
//   if (!u) {
//     console.log("还没有管理员");
//     return;
//   }
//   const r = await User.Get({ id: u.id }, store);
//   if (r.error) {
//     console.log(r.error.message);
//     return;
//   }
//   const user = r.data;
  const USER_ID = "101824580";
//   const COOKIE =
//     "ACT_ACCESS_CLIENT=2; USERSESSIONID=bb9a8e7cad621a8935fdbe292876b83eec5d6c252cd16bf6709eb9cbc2556ded; PHPSESSID=hoh4cd2uei3k6opor4pdur4bvi; 115_lang=zh; UID=101824580_A1_1716881668; CID=ed2f00ecd5b45ab2986e6b13f8b1e808; SEID=7120b34765e9eda7199c41a6410180657ad87aefc13fb3722dd91844522d8700dbf9b066602d2575156a67ff23d0b022c95178e9fa4e775135fa0b47; ACT_ACCESS_SOURCE=ad1; acw_tc=784e2ca917169489535344789e2ab51d488034e3f18ada1cdb0fad39ae68fd";
//   await Drive115Client.Create({
//     payload: {
//       user_id: USER_ID,
//       cookie: COOKIE,
//     },
//     user,
//     store,
//   });
  const r2 = await Drive115Client.Get({ unique_id: USER_ID, store });
  if (r2.error) {
    console.log(r2.error.message);
    return;
  }
  const drive = r2.data;
  const r3 = await drive.ping();
  if (r3.error) {
    console.log(r3.error.message);
    return;
  }
  const data = r3.data;
  console.log(data);
})();
