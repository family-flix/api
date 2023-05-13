/**
 * @file 对比本地数据库和云盘的文件差异
 */
require("dotenv").config();

import { DiffTypes } from "@/domains/folder_differ";
import { log } from "@/logger/log";
import { store } from "@/store";

import { diff_folder_with_drive_folder } from "./diff_folder_with_drive";

async function main() {
  const effects_on_drive_res = await diff_folder_with_drive_folder(
    {
      drives: [],
    },
    store
  );
  if (effects_on_drive_res.error) {
    return;
  }
  for (let i = 0; i < effects_on_drive_res.data.length; i += 1) {
    const { drive_id, effects } = effects_on_drive_res.data[i];
    //     const client = new AliyunDriveClient({ drive_id, store });
    for (let j = 0; j < effects.length; j += 1) {
      const effect = effects[j];
      const { type, payload } = effect;
      const { file_id, name } = payload;
      log("\n");
      log("[SCRIPT]process effect from diff", name, file_id, type);
      if (type === DiffTypes.Deleting) {
        await store.delete_folder({
          file_id,
        });
        log(`删除文件 '${name}' 成功`);
      }
    }
  }
}

main();
