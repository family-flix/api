import { Application } from "@/domains/application";
import { User } from "@/domains/user/index";

async function main() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  //   const DATABASE_PATH = "file://$OUTPUT_PATH/data/family-flix.db?connection_limit=1";
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  const r = await User.ChangePassword(
    {
      email: "",
      password: "",
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
