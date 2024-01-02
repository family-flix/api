import { AliyunBackupDriveClient } from "@/domains/aliyundrive";
import { AliyunDriveClient, AliyunDriveProfile } from "@/domains/aliyundrive/types";
import { User } from "@/domains/user";
import { Result } from "@/types";
import { parseJSONStr } from "@/utils";

import { store } from "./index";

const initialized: Record<string, AliyunDriveClient> = {};
export async function initial_share_client(user: User) {
  const { id } = user;
  if (initialized[id]) {
    return Result.Ok(initialized[id]);
  }
  // 取第一个云盘用来获取分享文件列表，不涉及转存逻辑
  const first_drive_res = await store.find_drive({ user_id: user.id });
  if (first_drive_res.error) {
    return Result.Err(first_drive_res.error.message);
  }
  const drive = first_drive_res.data;
  if (!drive) {
    return Result.Err("请先添加一个云盘", 10002);
  }
  const p_res = parseJSONStr<AliyunDriveProfile>(drive.profile);
  if (p_res.error) {
    return Result.Err(p_res.error.message);
  }
  const { drive_id } = p_res.data;
  const client_res = await AliyunBackupDriveClient.Get({ drive_id: String(drive_id), store });
  if (client_res.error) {
    return Result.Err(client_res.error.message);
  }
  const client = client_res.data;
  initialized[id] = client;
  return Result.Ok(client);
}
