import { AliyunDriveClient } from "@/domains/aliyundrive";
import { Result } from "@/types";
import { store_factory } from "@/store";
import { AliyunDriveRecord, RecordCommonPart } from "@/store/types";

import { notice_push_deer } from "./notice";

/**
 * 取表里所有「今日未签到」的云盘进行签到
 */
export async function check_in(store: ReturnType<typeof store_factory>) {
  console.log("start check in");
  const sql = `SELECT aliyun_drive.id,aliyun_drive.user_name
  FROM aliyun_drive 
  WHERE aliyun_drive.id NOT IN 
      (SELECT drive_check_in.drive_id 
       FROM drive_check_in 
       WHERE date(drive_check_in.checked_at) = date('now'))`;
  const drives_resp = await store.operation.all<
    (AliyunDriveRecord & RecordCommonPart)[]
  >(sql);
  if (drives_resp.error) {
    return drives_resp;
  }
  const drives_success: string[] = [];
  for (let i = 0; i < drives_resp.data.length; i += 1) {
    const drive = drives_resp.data[i];
    // console.log("prepare check in for drive", drive.user_name);
    const { id, name, user_name } = drive;
    const client = new AliyunDriveClient({
      drive_id: id,
      store: store,
    });
    const r = await client.checked_in();
    if (r.error) {
      continue;
    }
    drives_success.push(name || user_name);
    const now = new Date().toISOString();
    await store.add_check_in({
      drive_id: id,
      checked_at: now,
    });
  }
  if (drives_success.length === 0) {
    return Result.Ok(null);
  }
  notice_push_deer({
    title: "签到成功",
    markdown: drives_success.join("\n"),
  });
  return Result.Ok(null);
}
