import { AliyunBackupDriveClient } from "@/domains/aliyundrive";
import { Result } from "@/types";
import { DatabaseStore } from "@/domains/store";

import { notice_push_deer } from "./notice";
import { parseJSONStr } from "@/utils";

/**
 * 取表里所有「今日未签到」的云盘进行签到
 */
export async function check_in(store: DatabaseStore) {
  console.log("start check in");
  const sql = `SELECT aliyun_drive.id,aliyun_drive.user_name
  FROM aliyun_drive 
  WHERE aliyun_drive.id NOT IN 
      (SELECT drive_check_in.drive_id 
       FROM drive_check_in 
       WHERE date(drive_check_in.checked_at) = date('now'))`;
  const data = await store.prisma.drive.findMany({
    where: {
      NOT: {
        id: {
          in: await store.prisma.drive_check_in
            .findMany({
              where: {
                checked_at: {
                  // 表示「checked_at时间在今天内」这个条件
                  gte: new Date().toISOString().substr(0, 10) + "T00:00:00.000Z",
                  lt: new Date().toISOString().substr(0, 10) + "T23:59:59.999Z",
                },
              },
            })
            .then((res) => res.map((item) => item.drive_id)),
        },
      },
    },
  });
  // if (drives_resp.error) {
  //   return drives_resp;
  // }
  const drives_resp = {
    data,
  };
  const drives_success: string[] = [];
  for (let i = 0; i < drives_resp.data.length; i += 1) {
    const drive = drives_resp.data[i];
    // console.log("prepare check in for drive", drive.user_name);
    const { id, name, profile, user_id } = drive;
    const d_res = parseJSONStr<{ drive_id: number }>(profile);
    if (d_res.error) {
      continue;
    }
    const { drive_id } = d_res.data;
    const client_res = await AliyunBackupDriveClient.Get({
      drive_id: String(drive_id),
      store,
    });
    if (client_res.error) {
      continue;
    }
    const client = client_res.data;
    const r = await client.checked_in();
    if (r.error) {
      continue;
    }
    drives_success.push(name);
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
