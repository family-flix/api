/**
 * @file 遍历 searched_tv 表进行操作
 */
require("dotenv").config();
import { RecordCommonPart, SharedFilesInProgressRecord } from "@/store/types";
import { store } from "@/store/sqlite";

import { walk_table_with_pagination } from "@/domains/walker/utils";
import { AliyunDriveClient } from "@/domains/aliyundrive";

async function run() {
  const drives_res = await store.find_aliyun_drives();
  if (drives_res.error) {
    return;
  }
  const drives = drives_res.data;
  if (drives.length === 0) {
    return;
  }
  const drive = drives[0];
  const client = new AliyunDriveClient({ drive_id: drive.id, store });
  await walk_table_with_pagination<
    SharedFilesInProgressRecord & RecordCommonPart
  >(store.find_shared_files_in_progress_with_pagination, {
    async on_handle(shared_files) {
      const { url } = shared_files;
      console.log("prepare_fetch_shared_files", url);
      const r = await client.prepare_fetch_shared_files(url);
      if (r.error) {
        await store.delete_shared_files_in_progress({ url });
        return;
      }
      console.log(r.data);
    },
  });

  console.log("Complete");
}

run();
