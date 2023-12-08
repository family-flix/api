export enum FileType {
  File = 1,
  Folder = 2,
  Unknown = 3,
}

export enum ReportTypes {
  /** 电视剧问题 */
  TV,
  /** 电影问题 */
  Movie,
  /** 问题与建议 */
  Question,
  /** 想看什么剧 */
  Want,
}

export enum MediaProfileSourceTypes {
  TMDB = 1,
  /** 自动识别出的 花絮、彩蛋等 */
  Other = 2,
  /** 手动编辑 */
  Manual = 3,
}

export enum MediaTypes {
  Season = 1,
  Movie = 2,
}

export enum CollectionTypes {
  /** 手动创建 */
  Manually = 1,
  /** 每日更新 */
  DailyUpdate = 2,
  /** 每日更新草稿 */
  DailyUpdateDraft = 3,
  /** 每日更新存档 */
  DailyUpdateArchive = 4,
}

export enum MediaErrorTypes {
  TVProfile = 1,
  SeasonProfile = 2,
  EpisodeProfile = 3,
  MovieProfile = 4,
  TV = 5,
  Season = 6,
  Episode = 7,
  Movie = 8,
}
