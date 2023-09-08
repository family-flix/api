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
  /** 转存/归档资源 */
  Transfer,
  /** 删除云盘内文件 */
  DeleteDriveFile,
  /** 上传字幕 */
  UploadSubtitle,
}
