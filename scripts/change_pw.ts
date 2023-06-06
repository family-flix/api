import { User } from "@/domains/user";
import { store } from "@/store";

async function main() {
  const r = await User.ChangePassword(
    {
      email: "lita23232323o@aliyun.com",
      password: "qq862945626",
    },
    store
  );
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log("修改密码成功");
}

main();
