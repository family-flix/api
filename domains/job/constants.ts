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
  /** 刷新电视剧信息 */
  RefreshTVAndSeasonProfile,
  /** 转存资源 */
  Transfer,
}
