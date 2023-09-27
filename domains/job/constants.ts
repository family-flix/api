export enum TaskStatus {
  Running,
  Paused,
  Finished,
}
export enum TaskTypes {
  /** 云盘索引 */
  DriveAnalysis = 0,
  /** 电视剧转存 */
  MoveTV,
  /** 电影转存 */
  MoveMovie,
  /** 归档电视剧 */
  ArchiveSeason,
  /** 移动电影/电视剧到阿里云资源盘 */
  MoveToResourceDrive,
  /** 搜索影视剧详情 */
  SearchMedia,
  /** 文件夹更新 */
  FilesSync,
  /** 刷新电视剧信息 */
  RefreshTVAndSeasonProfile,
  ChangeTVAndSeasonProfile,
  /** 刷新电影信息 */
  RefreshMovieProfile,
  ChangeMovieProfile,
  /** 转存分享资源 */
  Transfer,
  /** 删除云盘内文件 */
  DeleteDriveFile,
  /** 上传字幕 */
  UploadSubtitle,
  /** 重命名多个文件 */
  RenameFiles,
  /** 领取签到奖励 */
  ReceiveSignInRewards,
  ClearInvalidFiles,
  /** 其他（不好归属的都到这里 */
  Other,
}
