export type RecordCommonPart = {
  id: string;
  created: string;
  updated: string;
};

export type TVRecord = {
  id?: string;
  name: string;
  original_name: string;
  file_id?: string;
  file_name?: string;
  /** 这个名字是手动输入用来在 tmdb 搜索的 */
  correct_name?: string;
  /** 关联的 tmdb 记录 */
  searched_tv_id?: string;
  hidden?: number;
  /** 属于哪个云盘 */
  drive_id: string;
  /** 属于哪个用户 */
  user_id: string;
};

export type SeasonRecord = {
  id?: string;
  tv_id: string;
  season: string;
  file_id?: string;
  file_name?: string;
};

export type EpisodeRecord = {
  id?: string;
  // 原始文件信息
  file_id: string;
  file_name: string;
  parent_file_id: string;
  size: number;
  // 推断出来的额外信息
  parent_paths: string;
  /** 季数 */
  season: string;
  /** 集数 */
  episode: string;
  /** 属于哪部电视剧 */
  tv_id: string;
  /** 属于哪个用户 */
  user_id: string;
  /** 在哪个网盘 */
  drive_id: string;
};

export type MovieRecord = {
  id: string;
  created: string;
  updated: string;
  user_id: string;
  /** 中文名称 */
  name: string;
  /** 外文原名或中文译名 */
  original_name: string;
  /** tmdb 记录 */
  searched_movie_id: string;
};

export type PlayHistoryRecord = {
  id?: string;
  /** 属于哪个用户 */
  user_id?: string;
  /** 属于哪个成员 */
  member_id?: string;
  tv_id: string;
  current_time: number;
  /** 总时长 */
  duration: number;
  episode_id: string;
  movie_id?: string;
};

export type SearchedTVRecord = {
  id?: string;
  tmdb_id: number;
  name?: string;
  original_name: string;
  overview: string;
  poster_path?: string;
  backdrop_path?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  original_language?: string;
};

export type SearchedTvWithNameRecord = {
  id?: string;
  name: string;
  original_name: string;
  searched_tv_id?: string;
};

export type SharedFilesRecord = {
  id?: string;
  user_id: string;
  title?: string;
  url: string;
};

export type AsyncTaskRecord = {
  id?: string;
  user_id: string;
  unique_id: string;
  status: string;
  need_stop?: number;
  error_messages?: string;
  desc?: string;
};

export type TmpTVRecord = {
  id?: string;
  name: string;
  original_name: string;
  searched_tv_id?: string;
  user_id: string;
  async_task_id: string;
};
export type TmpEpisodeRecord = {
  id?: string;
  episode: string;
  season: string;
  file_id: string;
  file_name: string;
  size: number;
  tv_id: string;
  parent_paths: string;
  parent_ids: string;
  user_id: string;
};

export type AliyunDriveRecord = {
  id?: string;
  user_id: string;
  app_id: string;
  drive_id: string;
  device_id: string;
  aliyun_user_id: string;
  avatar: string;
  nick_name: string;
  user_name: string;
  total_size?: number;
  used_size?: number;
  /** 网盘备注 */
  name?: string;
  /** 索引根目录 */
  root_folder_id?: string;
  /** 索引根名称 */
  root_folder_name?: string;
  /** 最近一次刮削的时间 */
  latest_analysis?: string;
};

export type AliyunDriveTokenRecord = {
  id?: string;
  aliyun_drive_id: string;
  access_token: string;
  refresh_token: string;
  expired_at?: number;
};

export type UserRecord = {
  id?: string;
  username: string;
  email: string;
  name: string;
  avatar: string;
};

export type MemberRecord = {
  id?: string;
  email?: string;
  name?: string;
  remark: string;
  owner_id: string;
  disabled?: number;
};

export type MemberLinkRecord = {
  id?: string;
  token: string;
  member_id: string;
  used?: number;
};

export type RecommendedTV = {
  sort?: number;
  tv_id: string;
  member_id: string;
};

export type DriveCheckInRecord = {
  id?: string;
  drive_id: string;
  checked_at: string;
};

/**
 * 阿里云盘的文件夹和文件，在本地数据库的快照
 */
export type FilesRecord = {
  id?: string;
  /** 该文件夹或文件的在云盘的唯一标志 */
  file_id: string;
  /** 文件夹或文件名称 */
  name: string;
  /** 类型 0文件夹、1文件 */
  type: number;
  /** 如果是文件，文件大小（字节） */
  size: number;
  /** 最后更新时间 */
  // updated_at: string;
  /** 父文件夹 id */
  parent_file_id: string;
  /** 在哪个云盘 */
  drive_id: string;
  /** 属于哪个用户 */
  user_id: string;
};

export type TmpFilesRecord = {
  id?: string;
  file_id?: string;
  /** 文件夹或文件名称 */
  name: string;
  /** 类型 0文件夹、1文件 */
  type: number;
  parent_path: string;
  /** 在哪个云盘 */
  drive_id: string;
  /** 属于哪个用户 */
  user_id: string;
};

/**
 * 连载中的分享文件夹
 */
export type SharedFilesInProgressRecord = {
  id?: string;
  /** 分享文件夹的 file_id */
  file_id: string;
  /** 分享文件夹的名称 */
  name: string;
  /** 该分享文件夹来自的分享链接 */
  url: string;
  /** 对应的网盘文件夹 */
  target_file_id?: string;
  /** 该连载是否已完成 */
  complete?: number;
  need_update?: number;
  user_id: string;
};

export type SearchedSeasonRecord = {
  /** 首发日期 */
  air_date: string;
  /** 总集数 */
  episode_count: number;
  tmdb_id: number;
  tmdb_tv_id: number;
  /** 季名称 */
  name: string;
  overview: string;
  poster_path: string;
  /** 第几季 */
  season_number: number;
  searched_tv_id: string;
};

export type TVNeedComplete = {
  id?: string;
  searched_tv_id: string;
  searched_season_id: string;
  episode_count: number;
  cur_count: number;
  user_id: string;
};
