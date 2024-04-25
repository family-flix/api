/**
 * 修改密码
 */
import { Application } from "@/domains/application/index";
import { User } from "@/domains/user/index";

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
  await User.ChangePassword({ email: "xxx@xxx.com", password: "" }, store);
  console.log("Success");
}

main();
