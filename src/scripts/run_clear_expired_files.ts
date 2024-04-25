/**
 * @file 清除所有无效的文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Application } from "@/domains/application";

import { User } from "@/domains/user";
import { clear_expired_files_in_drive, Drive } from "@/domains/drive";

const OUTPUT_PATH = "/apps/flix_prod";
const DATABASE_PATH = "file://$OUTPUT_PATH/data/family-flix.db?connection_limit=1";

const app = new Application({
  root_path: OUTPUT_PATH,
});
const store = app.store;

async function main() {
  const drives = await store.prisma.drive.findMany({});
  const t_res = await User.New("", store);
  if (t_res.error) {
    return;
  }
  const user = t_res.data;
  for (let i = 0; i < drives.length; i += 1) {
    await clear_expired_files_in_drive({ drive_id: drives[i].id, user, store });
  }
}

main();
