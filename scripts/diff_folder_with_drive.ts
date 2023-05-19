/**
 * 对比网盘文件和现在数据库 folder 的差异
 */

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { AliyunDriveFolder } from "@/domains/folder";
import { DifferEffect, FolderDiffer } from "@/domains/folder_differ";
import { folder_client, store_factory } from "@/store";
import { Result } from "@/types";
import { is_video_file } from "@/utils";
import { sleep } from "@/utils/flow";


export async function diff_folder_with_drive_folder(
  body: {
    drives?: string[];
  },
  store: ReturnType<typeof store_factory>
) {
  const drives_res = await store.find_drive_list();
  if (drives_res.error) {
    return Result.Err(drives_res.error);
  }
  const drives = drives_res.data;
  const effects_of_drive: {
    drive_id: string;
    effects: DifferEffect[];
  }[] = [];
  for (let i = 0; i < drives.length; i += 1) {
    const { id: drive_id, root_folder_id, root_folder_name } = drives[i];
    if (body.drives) {
      if (!body.drives.includes(drive_id)) {
        continue;
      }
    }
    if (!root_folder_id) {
      continue;
    }
    const drive_folder = {
      file_id: root_folder_id,
      file_name: root_folder_name,
    };
    const prev_folder = new AliyunDriveFolder(drive_folder.file_id, {
      name: drive_folder.file_name,
      client: folder_client({ drive_id }, store),
    });

    const client = new AliyunDriveClient({
      drive_id,
      store,
    });
    const folder = new AliyunDriveFolder(drive_folder.file_id, {
      name: drive_folder.file_name,
      client: {
        fetch_files: async (
          file_id: string,
          options: Partial<{ marker: string; page_size: number }> = {}
        ) => {
          await sleep(600);
          const r = await client.fetch_files(file_id, {
            ...options,
          });
          if (r.error) {
            return r;
          }
          return r;
        },
      },
    });
    const differ = new FolderDiffer({
      folder,
      prev_folder,
      unique_key: "name",
      filter(file) {
        const { type, name } = file;
        if (type === "file" && !is_video_file(name)) {
          return false;
        }
        // const need_skip = need_skip_the_file_when_walk({
        //   target_file_name: "downloads/P 破冰行动 (48集全 完结)",
        //   target_file_type: "folder",
        //   cur_file: {
        //     ...file,
        //     name: file.name,
        //     parent_paths: file.parent_paths,
        //   },
        // });
        // if (need_skip) {
        //   return false;
        // }
        return true;
      },
    });
    await differ.run();
    effects_of_drive.push({
      drive_id,
      effects: differ.effects,
    });
  }
  return Result.Ok(effects_of_drive);
}
