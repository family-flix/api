/**
 * @file 遍历网盘，但仅处理在 tmp_folder 中有记录的文件夹/文件
 */
import dayjs from "dayjs";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { walk_drive } from "@/domains/walker/analysis_aliyun_drive";
import { store_factory } from "@/store";

import { notice_error, notice_push_deer } from "./notice";
import { FileType } from "@/constants";
import { log } from "@/logger/log";

export async function walk_added_files(
  store: ReturnType<typeof store_factory>
) {
  const drives_res = await store.find_aliyun_drives();
  if (drives_res.error) {
    console.log("[ERROR]find drives failed,", drives_res.error.message);
    return;
  }
  for (let i = 0; i < drives_res.data.length; i += 1) {
    const drive = drives_res.data[i];
    const { id, user_id, user_name, latest_analysis } = drive;
    log("prepare process drive", id, user_name);
    const tmp_folders_res = await store.find_tmp_files(
      {
        drive_id: id,
      },
      {
        sorts: [
          {
            key: "updated",
            order: "DESC",
          },
        ],
      }
    );
    if (tmp_folders_res.error) {
      log("[ERROR]find tmp folders failed,", tmp_folders_res.error.message);
      continue;
    }
    if (tmp_folders_res.data.length === 0) {
      log("[INFO]there is no tmp folders");
      continue;
    }
    const latest_folder = tmp_folders_res.data[0];
    if (
      latest_analysis &&
      latest_folder.type === FileType.File &&
      dayjs(latest_folder.updated).isBefore(dayjs(latest_analysis))
    ) {
      log("[INFO]there is no latest tmp folder");
      continue;
    }
    const { root_folder_id, root_folder_name } = drive;
    if (!root_folder_id || !root_folder_name) {
      continue;
    }
    const client = new AliyunDriveClient({ drive_id: id, store });
    // const file_res = await client.fetch_file(root_folder_id);
    const files = tmp_folders_res.data.map((folder) => {
      const { name, parent_path, type } = folder;
      return {
        name: (() => {
          if (parent_path) {
            return `${root_folder_name}/${parent_path}/${name}`;
          }
          return `${root_folder_name}/${name}`;
        })(),
        type: type === FileType.File ? "file" : "folder",
      };
    });
    const r = await walk_drive({
      user_id,
      drive_id: id,
      files,
      client,
      store,
      need_upload_image: true,
      wait_complete: true,
    });
    if (r.error) {
      notice_error(`${user_name} 网盘刮削失败，因为 ${r.error.message}`);
      continue;
    }
    store.update_aliyun_drive(id, {
      latest_analysis: dayjs().toISOString(),
    });
    notice_push_deer({
      title: "网盘刮削成功",
      markdown: `${user_name} 网盘刮削成功`,
    });
  }
}
