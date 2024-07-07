/**
 * @file 平台无关的纯 js 工具函数
 */
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";

import { Result } from "@/domains/result/index";
import { JSONArray, JSONObject } from "@/types";

import { cn as nzhcn } from "./nzh/index";

dayjs.locale("zh-cn");

export function add_zeros(n: number, m: number) {
  let str = n.toString();
  const zeros_to_add = Math.max(0, m - str.length);
  const result = "0".repeat(zeros_to_add) + str;
  return result;
}
/**
 * 返回一个最短两位的数字字符串
 */
export function padding_zero(str: number | string) {
  const s = String(Number(str));
  if (s.length === 1) {
    return `0${s}`;
  }
  return s;
}
export function remove_str(filename: string, index: number = 0, length: number, placeholder: string = "") {
  return filename.slice(0, index) + placeholder + filename.slice(index + length);
}

/**
 * 各种奇怪的集数信息正常化
 * @param filename
 * @returns
 */
export function normalize_episode_text(filename: string) {
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
  if (!str.includes("E")) {
    return str;
  }
  // 主要是有 E01-02 这种奇葩合并剧集
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
  const num = str.match(/[0-9]{1,}/);
  if (!num) {
    return str;
  }
  const value = parseInt(num[0]);
  const chinese_num = num_to_chinese(value);
  const correct = chinese_num.match(/^一(十.{0,1})/);
  if (correct) {
    return `第${correct[1]}集`;
  }
  return `第${chinese_num}集`;
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
  const num = str.match(/[0-9]{1,}/);
  if (!num) {
    return str;
  }
  const value = parseInt(num[0]);
  const chinese_num = num_to_chinese(value);
  const correct = chinese_num.match(/^一(十.{0,1})/);
  if (correct) {
    return `第${correct[1]}季`;
  }
  return `第${chinese_num}季`;
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
/**
 * 更新数组中指定元素
 * @param arr
 * @param index
 * @param nextItem
 * @returns
 */
export function update<T extends any>(arr: T[], index: number, nextItem: T) {
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

export const video_file_type_regexp =
  /\.[mM][kK][vV]$|\.[mM][pP]4$|\.[tT][sS]$|\.[fF][lL][vV]$|\.[rR][mM][vV][bB]$|\.[mM][oO][vV]$/;
export function is_video_file(filename: string) {
  return video_file_type_regexp.test(filename);
}
export const img_file_type_regexp = /\.[pP][nN][gG]$|\.[jJ][pP][eE]{0,1}[gG]$|\.[wW][eE][bB][pP]$/;
export function is_img_file(filename: string) {
  return img_file_type_regexp.test(filename);
}
export const subtitle_file_type_regexp = /\.[sS][rR][tT]$|\.[vV][tT][tT]$|\.[aA][sS][sS]$/;
export function is_subtitle_file(filename: string) {
  return subtitle_file_type_regexp.test(filename);
}
export function is_nfo_file(filename: string) {
  return /\.[nN][fF][oO]$/.test(filename);
}

/** 不带 ? */
export function query_stringify(query: Record<string, string | number | boolean | undefined | null>) {
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

/** 解析一段 json 字符串 */
export function parseJSONStr<T extends JSONObject | JSONArray>(json: string | null) {
  if (!json) {
    return Result.Err("不是合法的 json");
  }
  try {
    if (json[0] !== "{" && json[0] !== "[") {
      return Result.Err("不是合法的 json");
    }
    const d = JSON.parse(json);
    return Result.Ok(d as T);
  } catch (err) {
    const e = err as Error;
    return Result.Err(e);
  }
}

export function compare_versions_with_timestamp(version1: string, version2: string): number {
  const [part1, timestamp1] = version1.split("-");
  const [part2, timestamp2] = version2.split("-");

  const parts1 = part1.split(".");
  const parts2 = part2.split(".");

  const max_length = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < max_length; i++) {
    const part1_num = parseInt(parts1[i], 10) || 0;
    const part2_num = parseInt(parts2[i], 10) || 0;

    if (part1_num < part2_num) {
      return -1;
    } else if (part1_num > part2_num) {
      return 1;
    }
  }

  if (timestamp1 && timestamp2) {
    const timestamp_diff = parseInt(timestamp1) - parseInt(timestamp2);
    return timestamp_diff < 0 ? -1 : timestamp_diff > 0 ? 1 : 0;
  }

  return 0;
}
