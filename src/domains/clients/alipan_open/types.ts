export type AlipanOpenPayload = {
  access_token: string;
  refresh_token: string;
  oauth_url?: string;
  client_id?: string;
  client_secret?: string;
};

export type AlipanOpenFileResp = {
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
  content_hash: string;
  updated_at: string;
  url: string;
  children: AlipanOpenFileResp[];
  childrenError: string;
};

export type AlipanOpenProfile = {
  user_name: string;
  nick_name: string;
  avatar: string;
  user_id: string;
  client_id?: string;
  client_secret?: string;
  drive_id: string;
  /** 如果是资源盘就有该字段 */
  backup_drive_id?: string;
  /** 如果是备份盘就有该字段 */
  resource_drive_id?: string;
};

export type AlipanOpenToken = {
  access_token: string;
  refresh_token: string;
  expired_at: number;
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
