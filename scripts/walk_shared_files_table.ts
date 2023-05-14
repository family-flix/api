/**
 * @file 遍历 searched_tv 表进行操作
 */
require("dotenv").config();
import { RecordCommonPart, SharedFilesRecord } from "@/store/types";
import { store } from "@/store";

import { walk_table_with_pagination } from "@/domains/walker/utils";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import dayjs from "dayjs";

async function run() {
  const drives_res = await store.find_aliyun_drives({});
  if (drives_res.error) {
    return;
  }
  const drives = drives_res.data;
  if (drives.length === 0) {
    return;
  }
  const drive = drives[0];
  const client = new AliyunDriveClient({ drive_id: drive.id, store });
  await walk_table_with_pagination<SharedFilesRecord & RecordCommonPart>(
    store.find_shared_files_list_with_pagination,
    {
      async on_handle(shared_files) {
        const { id, title, created, updated } = shared_files;
        console.log(title, created, updated);
        if (created.includes("GMT")) {
          const d = dayjs(created).toISOString();
          const r = await store.update_shared_files(id, {
            // @ts-ignore
            created: d,
          });
          if (r.error) {
            console.log("created failed", r.error.message);
          }
        }
        if (updated.includes("GMT")) {
          const r = await store.update_shared_files(id, {
            // @ts-ignore
            updated: dayjs(updated).toISOString(),
          });
          if (r.error) {
            console.log("updated failed", r.error.message);
          }
        }
      },
    }
  );

  console.log("Complete");
}

run();
