/**
 * @file 检查网盘状态
 */
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { walk_table_with_pagination } from "@/domains/walker/utils";
import { store_factory } from "@/store";
import { AliyunDriveRecord } from "@/store/types";
import { Result } from "@/types";

import { notice_error } from "./notice";

export async function ping_drive_status(
  store: ReturnType<typeof store_factory>
) {
  walk_table_with_pagination(store.find_drive_list_with_pagination, {
    body: {},
    async on_handle(v: AliyunDriveRecord) {
      const drive = v;
      if (!drive.id) {
        return;
      }
      const client = new AliyunDriveClient({ drive_id: drive.id, store });
      const r = await client.refresh_profile();
      if (r.error) {
        notice_error(r, "[ping]refresh_profile failed, ");
        return;
      }
      const file_res = await store.find_episode({
        drive_id: drive.id,
      });
      if (file_res.error) {
        notice_error(file_res, "[ping]find_episode failed, ");
        return;
      }
      if (!file_res.data) {
        notice_error(`[ping]${drive.user_name} 没有影片`);
        return;
      }
      const preview_res = await client.fetch_video_preview_info(
        file_res.data.file_id
      );
      if (preview_res.error) {
        const tip = `[ping]${drive.user_name} 获取影片 ${file_res.data.file_name} 失败，因为 ${preview_res.error.message}`;
        notice_error(tip);
        return;
      }
      if (preview_res.data.length === 0) {
        notice_error(
          `[ping]${drive.user_name} 影片 ${file_res.data.file_name} 没有播放信息`
        );
        return;
      }
      // console.log(`${drive.user_name} 状态正常`);
    },
  });
  return Result.Ok(null);
}

// ping_drive_status(store);
