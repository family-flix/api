export enum TaskStatus {
  Running,
  Paused,
  Finished,
}
export enum TaskTypes {
  /** 云盘索引 */
  DriveAnalysis = 0,
  /** 电视剧转存 */
  TVTransfer,
  /** 电影转存 */
  MovieTransfer,
  /** 移动电影/电视剧到阿里云资源盘 */
  MoveToResourceDrive,
  /** 搜索影视剧详情 */
  SearchMedia,
  /** 电视剧更新 */
  TVSync,
  /** 文件夹同步 */
  FolderSync,
  /** 刷新电视剧信息 */
  RefreshTVAndSeasonProfile,
  /** 刷新电影信息 */
  RefreshMovieProfile,
  /** 转存分享资源 */
  Transfer,
  /** 删除云盘内文件 */
  DeleteDriveFile,
  /** 上传字幕 */
  UploadSubtitle,
  /** 重命名多个文件 */
  RenameFiles,
}
