import { Application } from "@/domains/application";
import { User } from "@/domains/user/index";

async function main() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const args = process.argv;
  const password = args[2];
  if (!password) {
    console.error("请指定新密码，如 node pwd.js new_pwd");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  const r = await User.ChangePassword(
    {
      email: "admin@flix.com",
      password,
    },
    store
  );
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log("update password success!");
}
main();
