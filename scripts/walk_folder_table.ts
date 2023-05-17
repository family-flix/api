/**
 * @file 遍历 folder 表进行操作
 */
require("dotenv").config();
import { FilesRecord } from "@/store/types";
import { store } from "@/store";

import { walk_table_with_pagination } from "@/domains/walker/utils";

async function run() {
  await walk_table_with_pagination<FilesRecord>(
    store.find_file_with_pagination,
    {
      async on_handle(folder) {
        const { id, drive_id } = folder;
        const drive_res = await store.find_drive({ id: drive_id });
        if (drive_res.error) {
          return;
        }
        if (!drive_res.data) {
          return;
        }
        const { user_id } = drive_res.data;
        const r = await store.update_file(id!, {
          user_id,
        });
        if (r.error) {
          return;
        }
        console.log("update folder user id success");
      },
    }
  );
  console.log("Complete");
}

run();
