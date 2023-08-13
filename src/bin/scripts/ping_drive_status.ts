/**
 * @file 检查网盘状态
 */
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { DatabaseStore } from "@/domains/store";
import { walk_records } from "@/domains/store/utils";
import { Result } from "@/types";
import { parseJSONStr } from "@/utils";

import { notice_error } from "./notice";

export async function ping_drive_status(store: DatabaseStore) {
  walk_records(store.prisma.drive, {}, async (drive) => {
    if (!drive.id) {
      return;
    }
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
    const r = await client.refresh_profile();
    if (r.error) {
      notice_error(r, "[ping]refresh_profile failed, ");
      return;
    }
    const file_res = await store.find_parsed_episode({
      drive_id: drive.id,
    });
    if (file_res.error) {
      notice_error(file_res, "[ping]find_episode failed, ");
      return;
    }
    if (!file_res.data) {
      notice_error(`[ping]${drive.name} 没有影片`);
      return;
    }
    const preview_res = await client.fetch_video_preview_info(file_res.data.file_id);
    if (preview_res.error) {
      const tip = `[ping]${drive.name} 获取影片 ${file_res.data.file_name} 失败，因为 ${preview_res.error.message}`;
      notice_error(tip);
      return;
    }
    if (preview_res.data.sources.length === 0) {
      notice_error(`[ping]${drive.name} 影片 ${file_res.data.file_name} 没有播放信息`);
      return;
    }
  });
  return Result.Ok(null);
}

// ping_drive_status(store);
