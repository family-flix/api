/**
 * @file 遍历 searched_tv 表进行操作
 */
require("dotenv").config();
import { RecordCommonPart } from "@/store/types";
import { store } from "@/store";

import { walk_table_with_pagination } from "@/domains/walker/utils";
import dayjs from "dayjs";
import { walk_records } from "@/domains/store/utils";

async function run() {
  const drives_res = await store.find_drive_list({});
  if (drives_res.error) {
    return;
  }
  const drives = drives_res.data;
  if (drives.length === 0) {
    return;
  }
  const drive = drives[0];

  await walk_records(store.prisma.shared_file, {}, async (shared_file) => {
    const { id, title, created, updated } = shared_file;
    console.log(title, created, updated);
    // if (created.includes("GMT")) {
    //   const d = dayjs(created).toISOString();
    //   const r = await store.update_shared_files(id, {
    //     // @ts-ignore
    //     created: d,
    //   });
    //   if (r.error) {
    //     console.log("created failed", r.error.message);
    //   }
    // }
    // if (updated.includes("GMT")) {
    //   const r = await store.update_shared_files(id, {
    //     // @ts-ignore
    //     updated: dayjs(updated).toISOString(),
    //   });
    //   if (r.error) {
    //     console.log("updated failed", r.error.message);
    //   }
    // }
  });

  console.log("Complete");
}

run();
