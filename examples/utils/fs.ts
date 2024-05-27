import os from "os";
import path from "path";

import { copy } from "@/utils/fs";

async function main() {
  // const r = await copy(
  //   path.resolve(os.homedir(), "Documents/workspaces/family-flix/api/.env.template"),
  //   path.resolve(os.homedir(), "Documents/workspaces/family-flix/api/dist/.env")
  // );
  // if (r.error) {
  //   console.log(r.error.message);
  //   return;
  // }
  // console.log("复制成功", r.data);
  const r = path.parse('/apps/flix_prod/storage/21(2).mkv');
  console.log(r);
}

main();
