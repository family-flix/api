/**
 * 修改密码
 */
import { Application } from "@/domains/application/index";
import { User } from "@/domains/user/index";
import { Member } from "@/domains/user/member";

async function main() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  console.log("Start");
  // await User.ChangePassword({ email: "li1218040201@gmail.com", password: "123456" }, store);
  const r = await Member.ChangePassword({ email: "li1218040201@gmail.com", password: "123456" }, store);
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log("Success");
}

main();
