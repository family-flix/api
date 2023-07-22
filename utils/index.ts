import Nzh from "nzh";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relative_time from "dayjs/plugin/relativeTime";
import { parse_filename_for_video, VideoKeys } from "./parse_filename_for_video";

dayjs.extend(relative_time);
dayjs.locale("zh-cn");
const nzhcn = Nzh.cn;

export const video_file_type_regexp = /\.[mM][kK][vV]$|\.[mM][pP]4$|\.[tT][sS]$|\.[fF][lL][vV]$|\.[rR][mM][vV][bB]$/;
export type ParsedFilename = {
  /** 译名 */
  name: string;
  /** 原产地名称 */
  original_name: string;
};

export function has_key_factory(keys: VideoKeys[]) {
  return (key: VideoKeys) => {
    if (keys.includes(key)) {
      return key;
    }
    return undefined;
  };
}

export function is_season(s: string) {
  if (s[0] === "第" && s[s.length - 1] === "季") {
    return true;
  }
  if (/(SE|Season){1} {0,}[0-9]{1}/.test(s)) {
    return true;
  }
  return /^[sS][0-9]{1,}[eE]{0,1}[0-9]{0,}/.test(s);
}
export function extra_season_and_episode(c: string) {
  let i = 0;
  let inSeason = false;
  let inEpisode = false;
  const result = {
    season: "",
    episode: "",
  };
  if (!is_season(c)) {
    result;
  }
  while (i < c.length) {
    const s = c[i];
    if (s.toUpperCase() === "S") {
      if (c[i + 1].toUpperCase() === "E" && /[0-9]/.test(c[i + 2])) {
        inSeason = true;
        result.season += s.toUpperCase();
        i += 2;
        continue;
      }
      // log("[]extra", c, c.slice(i, 6));
      if (c.slice(i, 6).toLowerCase() === "season") {
        inSeason = true;
        result.season += s.toUpperCase();
        i += 6;
        continue;
      }
      inSeason = true;
      result.season += s;
      i += 1;
      continue;
    }
    if (s === "第") {
      inSeason = true;
      result.season += s;
      i += 1;
      continue;
    }
    if (s.toUpperCase() === "E") {
      inEpisode = true;
      inSeason = false;
      result.episode += s;
      i += 1;
      continue;
    }
    if (inEpisode) {
      result.episode += s;
      i += 1;
      continue;
    }
    if (inSeason) {
      result.season += s;
      i += 1;
      continue;
    }
    i += 1;
  }
  return result;
}
export function is_resolution(s: string) {
  return /[0-9]{1,}[pPiI]$/.test(s);
}

export function padding_zero(str: number | string) {
  if (String(str).length === 1) {
    return `0${str}`;
  }
  return String(str);
}
export function remove_str(filename: string, index: number = 0, length: number) {
  return filename.slice(0, index) + filename.slice(index + length);
}

export function normalize_season_number(filename: string) {
  let name = filename;
  // if (/[sS][0-9]{1,}[eE][0-9]{1,}/.test(name)) {

  // }
  return name.replace(/b([sS][0-9]{1,})([eE][0-9]{1,})\b/g, ".$1.$2");
}
/**
 * 各种奇怪的集数信息正常化
 * @param filename
 * @returns
 */
export function normalize_episode_number(filename: string) {
  let name = filename;
  // if there only two number, use as episode number.
  if (/(\.|^)[-_]{0,1}([0-9]{2,3})(\.|$)/.test(name)) {
    name = name.replace(/(\.|^)[-_]{0,1}([0-9]{2,3})(\.|$)/, ".E$2.");
  }
  return name.replace(/\b([0-9]{1})([0-9]{2})\b/g, "S$1.E$2");
}

export function generate_new_video_filename(
  params: Partial<{
    name: string;
    original_name: string;
    firstAirDate: string;
    season: string;
    episode: string;
    episodeName: string;
    resolution: string;
  }>
) {
  let result = [];
  const { name, original_name, firstAirDate, season, episode = "", episodeName = "", resolution } = params;
  if (name) {
    result.push(`[${name}]`);
  }
  if (original_name) {
    result.push(original_name.split(" ").join("."));
  }
  if (firstAirDate) {
    result.push(dayjs(firstAirDate).year());
  }
  if (season) {
    result.push(season + episode);
  }
  if (episodeName) {
    result.push(episodeName.split(" ").join("."));
  }
  if (resolution) {
    result.push(resolution);
  }
  return result.join(".");
}
export function episode_to_num(str: string) {
  const regex = /(\d+)/g;
  let s = str.replace(/[eE]/g, "");
  const matches = s.match(regex);
  if (!matches) {
    return str;
  }
  for (let i = 0; i < matches.length; i++) {
    const num = parseInt(matches[i], 10);
    s = String(num);
  }
  return Number(s);
}
export function episode_to_chinese_num(str: string) {
  const regex = /(\d+)/g;
  let s = str.replace(/[eE]/g, "");
  const matches = s.match(regex);
  if (!matches) {
    return str;
  }
  for (let i = 0; i < matches.length; i++) {
    const num = parseInt(matches[i], 10);
    const chinese_num = num_to_chinese(num);
    s = s.replace(matches[i], `第${chinese_num}集`);
  }
  return s;
}
export function season_to_num(str: string) {
  const regex = /(\d+)/g;
  let s = str.replace(/[sS]/g, "");
  const matches = s.match(regex);
  if (!matches) {
    return str;
  }
  for (let i = 0; i < matches.length; i++) {
    const num = parseInt(matches[i], 10);
    s = String(num);
  }
  return Number(s);
}
export function season_to_chinese_num(str: string) {
  const regex = /(\d+)/g;
  let s = str.replace(/[sS]/g, "");
  const matches = s.match(regex);
  if (!matches) {
    return str;
  }
  for (let i = 0; i < matches.length; i++) {
    const num = parseInt(matches[i], 10);
    const chinese_num = num_to_chinese(num);
    s = s.replace(matches[i], `第${chinese_num}季`);
  }
  return s;
}
/**
 * 阿拉伯数字转中文数字
 * @param num
 * @returns
 */
export function num_to_chinese(num: number) {
  return nzhcn.encodeS(num);
}
export function chinese_num_to_num(str: string) {
  return nzhcn.decodeS(str);
}

export function update<T>(arr: T[], index: number, nextItem: T) {
  if (index === -1) {
    return [...arr];
  }
  return [...arr.slice(0, index), nextItem, ...arr.slice(index + 1)];
}

/**
 * 通过后缀判断给定的文件名是否为一个视频文件名
 * @param filename 文件名
 * @returns
 */
export function is_video_relative_file(filename: string) {
  const types = [
    /\.[mM][kM][vV]$/,
    /\.[mM][pP]4$/,
    /\.[tT][sS]$/,
    /\.[fF][lL][vV]$/,
    /\.[nN][fF][oO]$/,
    /\.[aA][sS][sS]$/,
    /\.[sS][rR][tT]$/,
  ];
  return types.some((reg) => reg.test(filename));
}

export function is_video_file(filename: string) {
  return video_file_type_regexp.test(filename);
}

export function query_stringify(query: Record<string, string | number | undefined | null>) {
  return Object.keys(query)
    .filter((key) => {
      return query[key] !== undefined && query[key] !== null;
    })
    .map((key) => {
      return `${key}=${encodeURIComponent(query[key]!)}`;
    })
    .join("&");
}

const defaultRandomAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** 返回一条随机作为记录 id 的 15 位字符串 */
export function r_id() {
  return random_string(15);
}
/**
 * 返回一个指定长度的随机字符串
 * @param length
 * @returns
 */
export function random_string(length: number) {
  return random_string_with_alphabet(length, defaultRandomAlphabet);
}
function random_string_with_alphabet(length: number, alphabet: string) {
  let b = new Array(length);
  let max = alphabet.length;
  for (let i = 0; i < b.length; i++) {
    let n = Math.floor(Math.random() * max);
    b[i] = alphabet[n];
  }
  return b.join("");
}

export function maybe_same_tv(existing_names: string[], name: string) {}

/**
 * 推断 tv 的改变
 */
export function detect_change_of_tv(prev_filename: string, cur_filename: string) {
  const prev_parsed_info = parse_filename_for_video(prev_filename);
  const cur_parsed_info = parse_filename_for_video(cur_filename);
  const {
    name: prev_name,
    original_name: prev_original_name,
    season: prev_season,
    episode: prev_episode,
  } = prev_parsed_info;
  const {
    name: cur_name,
    original_name: cur_original_name,
    season: cur_season,
    episode: cur_episode,
  } = cur_parsed_info;
  const diff = [];
  if (prev_name !== cur_name) {
    diff.push({
      name: [prev_name, cur_name],
    });
  }
  if (prev_original_name !== cur_original_name) {
    diff.push({
      original_name: [prev_original_name, cur_original_name],
    });
  }
  if (prev_season !== cur_season) {
    diff.push({
      season: [prev_season, cur_season],
    });
  }
  if (prev_episode !== cur_episode) {
    diff.push({
      episode: [prev_episode, cur_episode],
    });
  }
  return diff;
}

export function bytes_to_size(bytes: number) {
  if (bytes === 0) {
    return "0KB";
  }
  const symbols = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let exp = Math.floor(Math.log(bytes) / Math.log(1024));
  if (exp < 1) return bytes + " " + symbols[0];
  bytes = Number((bytes / Math.pow(1024, exp)).toFixed(2));
  const size = bytes;
  const unit = symbols[exp];
  if (Number.isInteger(size)) {
    return `${size}${unit}`;
  }
  function remove_zero(num: number | string) {
    let result = Number(num);
    if (String(num).indexOf(".") > -1) {
      result = parseFloat(num.toString().replace(/0+?$/g, ""));
    }
    return result;
  }
  return `${remove_zero(size.toFixed(2))}${unit}`;
}

export function find_resolution_from_paths(full_path: string) {
  const paths = full_path.split("/");
  let i = paths.length - 1;
  while (i > 0) {
    const p = paths[i];
    const { resolution } = parse_filename_for_video(p, ["resolution"]);
    if (resolution) {
      return resolution;
    }
    i -= 1;
  }
  return null;
}

export function find_recommended_pathname(paths: string[]) {
  const matched = paths.find((name) => {
    if (name.match(/4[kK]/)) {
      if (name.match(/去片头/)) {
        return true;
      }
      if (name.match(/纯享版{0,1}/)) {
        return true;
      }
      if (name.match(/[hH]265/)) {
        return true;
      }
      return true;
    }
    if (name.match(/去片头/)) {
      return true;
    }
    if (name.match(/纯享版{0,1}/)) {
      return true;
    }
    if (name.match(/[hH]265/)) {
      return true;
    }
    return false;
  });
  if (!matched) {
    return paths[0];
  }
  return matched;
}

/**
 * 秒数转时分秒
 * @param value
 * @returns
 */
export function seconds_to_hour(value: number) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value - hours * 3600) / 60);
  const seconds = Math.floor(value - hours * 3600 - minutes * 60);
  if (hours > 0) {
    return hours + ":" + padding_zero(minutes) + ":" + padding_zero(seconds);
  }
  return padding_zero(minutes) + ":" + padding_zero(seconds);
}

export function relative_time_from_now(time: string) {
  const date = dayjs(time);
  const now = dayjs();
  const minute_diff = now.diff(date, "minute");
  let relativeTimeString;
  if (minute_diff >= 7 * 24 * 60) {
    relativeTimeString = "7天前";
  } else if (minute_diff >= 24 * 60) {
    relativeTimeString = now.diff(date, "day") + "天前"; // 显示天数级别的时间差
  } else if (minute_diff >= 60) {
    relativeTimeString = now.diff(date, "hour") + "小时前"; // 显示小时级别的时间差
  } else if (minute_diff > 0) {
    relativeTimeString = minute_diff + "分钟前"; // 显示分钟级别的时间差
  } else {
    relativeTimeString = "刚刚"; // 不到1分钟，显示“刚刚”
  }
  return relativeTimeString;
}

export function is_japanese(text: string) {
  const chinese_char = text.match(/[\u4e00-\u9fff]/g) || [];
  const japanese_char = text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g) || [];
  if (japanese_char.length > chinese_char.length) {
    return true;
  }
  return false;
}
export function is_korean(text: string) {
  const chinese_char = text.match(/[\u4e00-\u9fff]/g) || [];
  const korean_char = text.match(/[\uac00-\ud7a3]/g) || [];
  if (korean_char.length > chinese_char.length) {
    return true;
  }
  return false;
}

export function noop() {}
export function promise_noop() {
  return Promise.resolve();
}

export function filter_undefined_key<T>(value: T): T {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    const v = value.map(filter_undefined_key);
    return v as unknown as T;
  }
  const v = Object.entries(value).reduce((acc, [key, v]) => {
    const cleanedValue = filter_undefined_key(v);
    if (cleanedValue !== undefined && cleanedValue !== "") {
      // @ts-ignore
      acc[key] = cleanedValue;
    }
    return acc;
  }, {} as T);
  return v;
}

/**
 * 延迟指定时间
 * @param delay 要延迟的时间，单位毫秒
 * @returns
 */
export function sleep(delay: number = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, delay);
  });
}
