/**
 * @file 增量索引云盘（仅索引新转存的文件夹）
 */
import dayjs from "dayjs";

import { AliyunDriveClient } from "@/domains/aliyundrive";

import { FileType } from "@/constants";
import { DatabaseStore } from "@/domains/store";
import { parseJSONStr } from "@/utils";

export async function walk_added_files(store: DatabaseStore) {
  const drives_res = await store.find_drive_list();
  if (drives_res.error) {
    console.log("[ERROR]find drives failed,", drives_res.error.message);
    return;
  }
  for (let i = 0; i < drives_res.data.length; i += 1) {
    const drive = drives_res.data[i];
    const { id, user_id, name, latest_analysis } = drive;
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
      // log("[ERROR]find tmp folders failed,", tmp_folders_res.error.message);
      continue;
    }
    if (tmp_folders_res.data.length === 0) {
      // log("[INFO]there is no tmp folders");
      continue;
    }
    const latest_folder = tmp_folders_res.data[0];
    if (
      latest_analysis &&
      latest_folder.type === FileType.File &&
      dayjs(latest_folder.updated).isBefore(dayjs(latest_analysis))
    ) {
      // log("[INFO]there is no latest tmp folder");
      continue;
    }
    const { root_folder_id, root_folder_name } = drive;
    if (!root_folder_id || !root_folder_name) {
      continue;
    }
    const d_res = await parseJSONStr<{ drive_id: number }>(drive.profile);
    if (d_res.error) {
      return;
    }
    const { drive_id } = d_res.data;
    const client_res = await AliyunDriveClient.Get({ drive_id, store });
    if (client_res.error) {
      continue;
    }
    const client = client_res.data;
    const files = tmp_folders_res.data.map((folder) => {
      const { name, parent_paths, type } = folder;
      return {
        name: (() => {
          if (parent_paths) {
            return `${root_folder_name}/${parent_paths}/${name}`;
          }
          return `${root_folder_name}/${name}`;
        })(),
        type: type === FileType.File ? "file" : "folder",
      };
    });
    // const r = await walk_drive({
    //   user_id,
    //   drive_id: id,
    //   files,
    //   client,
    //   store,
    //   upload_image: true,
    //   wait_complete: true,
    // });
    // if (r.error) {
    //   notice_error(`${name} 云盘索引失败，因为 ${r.error.message}`);
    //   continue;
    // }
    // store.update_drive(id, {
    //   latest_analysis: dayjs().toISOString(),
    // });
    // notice_push_deer({
    //   title: "云盘索引成功",
    //   markdown: `${name} 云盘索引成功`,
    // });
  }
}
