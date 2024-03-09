export type QuarkDrivePayload = {
  id: string;
  token: string;
  root_folder_id?: string;
};

export type QuarkDriveFileResp = {
  fid: string;
  file_name: string;
  pdir_fid: string;
  category: number;
  file_type: number;
  size: number;
  format_type: string;
  status: number;
  tags: string;
  owner_ucid: string;
  l_created_at: number;
  l_updated_at: number;
  source: string;
  file_source: string;
  name_space: number;
  l_shot_at: number;
  thumbnail: string;
  big_thumbnail: string;
  preview_url: string;
  video_max_resolution: string;
  video_width: number;
  series_dir: boolean;
  upload_camera_root_dir: boolean;
  video_height: number;
  video_rotate: number;
  fps: number;
  like: number;
  operated_at: number;
  risk_type: number;
  backup_sign: number;
  obj_category: string;
  file_name_hl_start: number;
  file_name_hl_end: number;
  file_struct: {
    fir_source: string;
    sec_source: string;
    thi_source: string;
    platform_source: string;
  };
  duration: number;
  last_play_info: {
    time: number;
  };
  event_extra: {
    play_progress: number;
    is_open: boolean;
    view_at: number;
  };
  cover_face_boundary: string[][];
  offline_source: boolean;
  backup_source: boolean;
  owner_drive_type_or_default: number;
  save_as_source: boolean;
  ban: boolean;
  raw_name_space: number;
  cur_version_or_default: number;
  dir: boolean;
  file: boolean;
  created_at: number;
  updated_at: number;
  _extra: {};
};

export type QuarkDriveProfile = {
  name: string;
};
