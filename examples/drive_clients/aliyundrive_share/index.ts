import path from "path";
import os from "os";

import { Drive } from "@/domains/drive";
import { Application } from "@/domains/application";
import { User } from "@/domains/user";
import { AliyunShareResourceClient } from "@/domains/clients/aliyun_resource";

async function main() {
  const app = new Application({
    root_path: path.resolve(os.homedir(), "/Users/litao/Documents/t.media.output"),
  });
  const store = app.store;
  const t_res = await User.Get({ id: "80Z1qBOiC7r5i5g" }, store);
  if (t_res.error) {
    console.log(t_res.error.message);
    return;
  }
  const user = t_res.data;
  const drive_id = "yqyCOWYvoVNk68C";
  const url = "https://www.alipan.com/s/UvqcTmkJqxJ";
  const pwd = "";
  const ignore_invalid = false;
  console.log("before AliyunShareResourceClient");
  const r2 = await AliyunShareResourceClient.Get({
    id: drive_id,
    url,
    code: pwd,
    ignore_invalid,
    user,
    store,
  });
  if (r2.error) {
    console.log(r2.error.message);
    return;
  }
  console.log(r2.data);
}

main();
