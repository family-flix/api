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

export enum CollectionStatus {
  Draft = 1,
  Published = 2,
  Hidden = 3,
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

export enum ResourceSyncTaskStatus {
  WaitLinkFolder = 1,
  WaitSetProfile = 2,
  WorkInProgress = 3,
  Completed = 4,
}

/** 影片分辨率 */
export enum MediaResolutionTypes {
  /** 标清 */
  LD = "LD",
  /** 普清 */
  SD = "SD",
  /** 高清 */
  HD = "HD",
  /** 超高清 */
  FHD = "FHD",
}
/** 影片分辨率中文描述 */
export const MediaResolutionTypeTexts = {
  [MediaResolutionTypes.LD]: "标清",
  [MediaResolutionTypes.SD]: "普清",
  [MediaResolutionTypes.HD]: "高清",
  [MediaResolutionTypes.FHD]: "4K",
};

export enum SubtitleFileTypes {
  /** 上传到服务器本地的 */
  LocalFile = 1,
  /** 在阿里云盘的 */
  AliyundriveFile = 2,
  /** 内挂字幕 */
  MediaInnerFile = 3,
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

export enum MediaGenresTypes {
  /** 纪录片 */
  Documentary = 1,
  /** 传记 */
  Biography = 2,
  /** 犯罪 */
  Crime = 3,
  /** 历史 */
  History = 4,
  /** 动作 */
  Action = 5,
  /** 情色 */
  Adult = 6,
  /** 歌舞 */
  Musical = 7,
  /** 儿童 */
  Children = 8,
  /** 悬疑 */
  Suspense = 10,
  /** 剧情 */
  Plot = 11,
  /** 灾难 */
  Disaster = 12,
  /** 爱情 */
  Romance = 13,
  /** 音乐 */
  Music = 14,
  /** 冒险 */
  Adventure = 15,
  /** 奇幻 */
  Fantasy = 16,
  /** 科幻 */
  ScienceFiction = 17,
  /** 运动 */
  Sports = 18,
  /** 惊悚 */
  Thriller = 19,
  /** 恐怖 */
  Horror = 20,
  /** 战争 */
  War = 22,
  /** 短片 */
  ShortFilm = 23,
  /** 喜剧 */
  Comedy = 24,
  /** 动画 */
  Animation = 25,
  /** 西部 */
  Western = 27,
  /** 家庭 */
  Family = 28,
  /** 武侠 */
  Wuxia = 29,
  /** 古装 */
  CostumeDrama = 30,
  /** 黑色电影 */
  FilmNoir = 31,
}
export const TMDB_GENRES_MAP_TO_DOUBAN = {
  /** 动画 */
  16: MediaGenresTypes.Animation,
  /** 剧情 */
  18: MediaGenresTypes.Plot,
  /** 恐怖 */
  27: MediaGenresTypes.Horror,
  /** 动作 */
  28: MediaGenresTypes.Action,
  /** 喜剧 */
  35: MediaGenresTypes.Comedy,
  /** 惊悚 */
  53: MediaGenresTypes.Thriller,
  /** 科幻 */
  878: MediaGenresTypes.ScienceFiction,
  /** 悬疑 */
  9648: MediaGenresTypes.Suspense,
  /** 音乐 */
  10402: MediaGenresTypes.Music,
  /** 爱情 */
  10749: MediaGenresTypes.Romance,
  /** 家庭 */
  10751: MediaGenresTypes.Family,
  10759: MediaGenresTypes.Action,
  /** 科幻&奇幻(Sci-Fi & Fantasy) */
  10765: MediaGenresTypes.ScienceFiction,
};
/**
 * 影视剧产地，不同描述映射到同一个值
 */
export const MEDIA_COUNTRY_MAP: Record<string, string> = {
  大陆: "CN",
  普通话: "CN",
  内地: "CN",
  中国: "CN",
  韩国: "KR",
  美国: "US",
};
export const MEDIA_TYPE_MAP: Record<string, string> = {
  电影: "movie",
  电视剧: "tv",
  综艺: "tv",
  纪录片: "tv",
};
export const MEDIA_GENRES_MAP: Record<string, string> = {
  真人秀: "真人秀",
  综艺: "真人秀",
  剧情: "剧情",
  犯罪: "犯罪",
  动作: "动作",
  // 游戏: "真人秀",
};
export const MEDIA_SOURCE_MAP: Record<string, string> = {
  优酷: "youku",
  youku: "youku",
  腾讯: "qq",
  qq: "qq",
  爱奇艺: "iqiyi",
  iqiyi: "iqiyi",
  mgtv: "mgtv",
  imgo: "mgtv",
  tmdb: "tmdb",
};

/**
 * 原产地
 * @doc https://www.iso.org/standard/63545.html
 */
export enum MediaOriginCountries {
  /**  // 美国 (United States) */
  US = "US",
  /**  // 中国 (China) */
  CN = "CN",
  TW = "TW", // 中国台湾 (Taiwan)
  HK = "HK", // 中国香港 (Hong Kong)
  JP = "JP", // 日本 (Japan)
  DE = "DE", // 德国 (Germany)
  GB = "GB", // 英国 (United Kingdom)
  FR = "FR", // 法国 (France)
  IT = "IT", // 意大利 (Italy)
  BR = "BR", // 巴西 (Brazil)
  CA = "CA", // 加拿大 (Canada)
  AU = "AU", // 澳大利亚 (Australia)
  IN = "IN", // 印度 (India)
  RU = "RU", // 俄罗斯 (Russia)
  KR = "KR", // 韩国 (South Korea)
  BE = "BE", // 比利时
  ES = "ES", // 西班牙 (Spain)
  MX = "MX", // 墨西哥 (Mexico)
  ID = "ID", // 印度尼西亚 (Indonesia)
  TR = "TR", // 土耳其 (Turkey)
  SA = "SA", // 沙特阿拉伯 (Saudi Arabia)
  ZA = "ZA", // 南非 (South Africa)
  AR = "AR", // 阿根廷 (Argentina)
  TH = "TH", // 泰国 (Thailand)
  EG = "EG", // 埃及 (Egypt)
  NL = "NL", // 荷兰 (Netherlands)
  CH = "CH", // 瑞士 (Switzerland)
  SE = "SE", // 瑞典 (Sweden)
  PL = "PL", // 波兰 (Poland)
  PK = "PK", // 巴基斯坦 (Pakistan)
  NG = "NG", // 尼日利亚 (Nigeria)
  MY = "MY", // 马来西亚 (Malaysia)
  BD = "BD", // 孟加拉国 (Bangladesh)
}

export const SeasonMediaOriginCountryTextMap: Record<MediaOriginCountries, string> = {
  [MediaOriginCountries.CN]: "国产剧",
  [MediaOriginCountries.TW]: "台剧",
  [MediaOriginCountries.HK]: "港剧",
  [MediaOriginCountries.JP]: "日剧",
  [MediaOriginCountries.KR]: "韩剧",
  [MediaOriginCountries.US]: "美剧",
  [MediaOriginCountries.GB]: "英剧",
  [MediaOriginCountries.FR]: "法国",
  [MediaOriginCountries.IT]: "意大利",
  [MediaOriginCountries.BR]: "巴西",
  [MediaOriginCountries.BE]: "比利时",
  [MediaOriginCountries.DE]: "德国",
  [MediaOriginCountries.CA]: "加拿大",
  [MediaOriginCountries.AU]: "澳大利亚",
  [MediaOriginCountries.IN]: "印度",
  [MediaOriginCountries.RU]: "俄罗斯",
  [MediaOriginCountries.ES]: "西班牙",
  [MediaOriginCountries.MX]: "墨西哥",
  [MediaOriginCountries.ID]: "印度尼西亚",
  [MediaOriginCountries.TR]: "土耳其",
  [MediaOriginCountries.SA]: "沙特阿拉伯",
  [MediaOriginCountries.ZA]: "南非",
  [MediaOriginCountries.AR]: "阿根廷",
  [MediaOriginCountries.TH]: "泰国",
  [MediaOriginCountries.EG]: "埃及",
  [MediaOriginCountries.NL]: "荷兰",
  [MediaOriginCountries.CH]: "瑞士",
  [MediaOriginCountries.SE]: "瑞典",
  [MediaOriginCountries.PL]: "波兰",
  [MediaOriginCountries.PK]: "巴基斯坦",
  [MediaOriginCountries.NG]: "尼日利亚",
  [MediaOriginCountries.MY]: "马来西亚",
  [MediaOriginCountries.BD]: "孟加拉国",
};
export const TVGenres = [
  "动作冒险",
  "动画",
  "喜剧",
  "犯罪",
  "纪录",
  "剧情",
  "家庭",
  "儿童",
  "悬疑",
  "新闻",
  "真人秀",
  "Sci-Fi & Fantasy",
  "肥皂剧",
  "脱口秀",
  "War & Politics",
  "西部",
];
export const TVGenresTexts: Record<string, string> = TVGenres.map((text) => {
  return {
    [text]: (() => {
      if (text === "Sci-Fi & Fantasy") {
        return "奇幻";
      }
      if (text === "War & Politics") {
        return "战争/政治";
      }
      return text;
    })(),
  };
}).reduce((r, c) => {
  return {
    ...r,
    ...c,
  };
}, {});
export const TVGenresOptions = TVGenres.map((text) => {
  return {
    label: TVGenresTexts[text],
    value: text,
  };
});

export const MovieMediaOriginCountryTextMap: Record<MediaOriginCountries, string> = {
  [MediaOriginCountries.CN]: "中国大陆",
  [MediaOriginCountries.TW]: "中国台湾",
  [MediaOriginCountries.HK]: "中国香港",
  [MediaOriginCountries.JP]: "日本",
  [MediaOriginCountries.KR]: "韩国",
  [MediaOriginCountries.US]: "美国",
  [MediaOriginCountries.GB]: "英国",
  [MediaOriginCountries.FR]: "法国",
  [MediaOriginCountries.IT]: "意大利",
  [MediaOriginCountries.BR]: "巴西",
  [MediaOriginCountries.DE]: "德国",
  [MediaOriginCountries.CA]: "加拿大",
  [MediaOriginCountries.AU]: "澳大利亚",
  [MediaOriginCountries.IN]: "印度",
  [MediaOriginCountries.RU]: "俄罗斯",
  [MediaOriginCountries.BE]: "比利时",
  [MediaOriginCountries.ES]: "西班牙",
  [MediaOriginCountries.MX]: "墨西哥",
  [MediaOriginCountries.ID]: "印度尼西亚",
  [MediaOriginCountries.TR]: "土耳其",
  [MediaOriginCountries.SA]: "沙特阿拉伯",
  [MediaOriginCountries.ZA]: "南非",
  [MediaOriginCountries.AR]: "阿根廷",
  [MediaOriginCountries.TH]: "泰国",
  [MediaOriginCountries.EG]: "埃及",
  [MediaOriginCountries.NL]: "荷兰",
  [MediaOriginCountries.CH]: "瑞士",
  [MediaOriginCountries.SE]: "瑞典",
  [MediaOriginCountries.PL]: "波兰",
  [MediaOriginCountries.PK]: "巴基斯坦",
  [MediaOriginCountries.NG]: "尼日利亚",
  [MediaOriginCountries.MY]: "马来西亚",
  [MediaOriginCountries.BD]: "孟加拉国",
};
export const MovieGenres = [
  "动作",
  "冒险",
  "动画",
  "喜剧",
  "犯罪",
  "纪录",
  "剧情",
  "家庭",
  "奇幻",
  "历史",
  "恐怖",
  "音乐",
  "悬疑",
  "爱情",
  "科幻",
  "电视电影",
  "惊悚",
  "战争",
  "西部",
];
export const MovieGenresTexts: Record<string, string> = TVGenres.map((text) => {
  return {
    [text]: text,
  };
}).reduce((t, c) => {
  return {
    ...t,
    ...c,
  };
}, {});
export const MovieGenresOptions = MovieGenres.map((text) => {
  return {
    label: text,
    value: text,
  };
});

export const SubtitleLanguageMap = {
  chi: [MediaOriginCountries.CN],
  eng: [MediaOriginCountries.US],
  jpn: [MediaOriginCountries.JP],
};
