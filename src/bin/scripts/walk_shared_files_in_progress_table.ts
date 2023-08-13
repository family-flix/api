/**
 * @file 遍历 searched_tv 表进行操作
 */
require("dotenv").config();

import { store } from "@/store";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { walk_records } from "@/domains/store/utils";
import { parseJSONStr } from "@/utils";

async function run() {
  const drives_res = await store.find_drive_list();
  if (drives_res.error) {
    return;
  }
  const drives = drives_res.data;
  if (drives.length === 0) {
    return;
  }
  const drive = drives[0];
  const d_res = await parseJSONStr<{ drive_id: number }>(drive.profile);
  if (d_res.error) {
    return;
  }
  const { drive_id } = d_res.data;
  const client_res = await AliyunDriveClient.Get({ drive_id, store });
  if (client_res.error) {
    return;
  }
  const client = client_res.data;

  await walk_records(store.prisma.bind_for_parsed_tv, {}, async (bind) => {
    const { url } = bind;
    console.log("prepare_fetch_shared_files", url);
    const r = await client.fetch_share_profile(url);
    if (r.error) {
      await store.delete_shared_file_save({ url });
      return;
    }
    console.log(r.data);
  });

  console.log("Complete");
}

run();
