import { AliyunBackupDriveClient } from ".";
import { AliyunResourceClient } from "./resource";

export type AliyunDriveToken = {
  access_token: string;
  refresh_token: string;
  // drive_id: string;
  expired_at: number;
};

export type AliyunDriveFileResp = {
  created_at: string;
  drive_id: string;
  file_id: string;
  name: string;
  parent_file_id: string;
  starred: boolean;
  sync_device_flag: boolean;
  sync_flag: boolean;
  sync_meta: string;
  type: string;
  updated_at: string;
  children: AliyunDriveFileResp[];
  childrenError: string;
};

export type PartialAliyunDriveFile = {
  file_id: string;
  name: string;
  parent_file_id: string;
  type?: string;
  size?: number;
  items?: PartialAliyunDriveFile[];
};

export interface PartialVideo {
  template_id: "LD" | "SD" | "HD" | "FHD";
  template_name: "pdsLD" | "pdsSD" | "pdsHD" | "pdsFHD";
  template_width: number;
  template_height: number;
  status: "running" | "finished" | "failed";
  /** m3u8 文件地址 */
  url: string;
}

export type AliyunDrivePayload = {
  app_id: string;
  drive_id: number;
  device_id: string;
  access_token: string;
  refresh_token: string;
  avatar: string;
  nick_name: string;
  user_name: string;
  user_id: string;
  /** 这个名称是导出云盘凭证时会有的，和 user_name、nick_name 相比优先取这个 */
  name?: string;
  resource_drive_id?: string;
  /** 这个是导出云盘凭证时会有的 */
  root_folder_id: string | null;
  /** 这个是导出云盘凭证时会有的 */
  total_size?: number;
  /** 这个是导出云盘凭证时会有的 */
  used_size?: number;
};

export type AliyunDriveProfile = {
  user_name: string;
  nick_name: string;
  avatar: string;
  drive_id: string;
  device_id: string;
  user_id: string;
  app_id: string;
  resource_drive_id?: string;
};

export type AliyunDriveClient = AliyunBackupDriveClient | AliyunResourceClient;
