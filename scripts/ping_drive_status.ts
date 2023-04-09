/**
 * @file 检查网盘状态
 */
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { store_factory } from "@/store";
import { Result } from "@/types";

import { notice_error } from "./notice";

export async function ping_drive_status(
  store: ReturnType<typeof store_factory>
) {
  const drives_res = await store.find_aliyun_drives();
  if (drives_res.error) {
    return;
  }
  for (let i = 0; i < drives_res.data.length; i += 1) {
    const drive = drives_res.data[i];
    const client = new AliyunDriveClient({ drive_id: drive.id, store });
    const r = await client.refresh_profile();
    if (r.error) {
      notice_error(r);
      continue;
    }
    const file_res = await store.find_episode({
      drive_id: drive.id,
    });
    if (file_res.error) {
      notice_error(file_res);
      continue;
    }
    if (!file_res.data) {
      console.log(`${drive.user_name} 没有影片`);
      continue;
    }
    const preview_res = await client.fetch_video_preview_info(
      file_res.data.file_id
    );
    if (preview_res.error) {
      const tip = `${drive.user_name} 获取影片 ${file_res.data.file_name} 失败，因为 ${preview_res.error.message}`;
      notice_error(tip);
      continue;
    }
    if (preview_res.data.length === 0) {
      console.log(
        `${drive.user_name} 影片 ${file_res.data.file_name} 没有播放信息`
      );
      continue;
    }
    console.log(`${drive.user_name} 状态正常`);
  }
  return Result.Ok(null);
}

// ping_drive_status(store);
