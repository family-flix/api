/**
 * @file 工具方法
 */
import { describe, expect, test } from "vitest";
import dayjs from "dayjs";

import { compare_versions_with_timestamp, season_to_chinese_num } from "..";
import { build_media_name } from "../parse_filename_for_video";

describe("季 转中文描述", () => {
  test("一位数", () => {
    const name = "S05";
    const result = season_to_chinese_num(name);
    expect(result).toStrictEqual("第五季");
  });
  test("两位数", () => {
    const name = "S12";
    const result = season_to_chinese_num(name);
    expect(result).toStrictEqual("第十二季");
  });
  test("特殊的 10", () => {
    const name = "S10";
    const result = season_to_chinese_num(name);
    expect(result).toStrictEqual("第十季");
  });
  test("三位数", () => {
    const name = "S121";
    const result = season_to_chinese_num(name);
    expect(result).toStrictEqual("第一百二十一季");
  });
  test("特殊的 100", () => {
    const name = "S100";
    const result = season_to_chinese_num(name);
    expect(result).toStrictEqual("第一百季");
  });
  test("特殊的 110", () => {
    const name = "S110";
    const result = season_to_chinese_num(name);
    expect(result).toStrictEqual("第一百一十季");
  });
});

describe("时间格式化", () => {
  test("年月日", () => {
    const time = "2021-02-03";
    const r = dayjs(time).format("YYMMDD");
    expect(r).toBe("210203");
  });
  test("短年", () => {
    const air_date = "2017-05-07";
    const d = dayjs(air_date);
    const episode_month_and_day = d.format("MMDD");
    const episode_year_and_month_and_day = d.format("YYYYMMDD");
    const episode_short_year_and_month_and_day = d.format("YYMMDD");
    expect(episode_month_and_day).toBe("0507");
    expect(episode_year_and_month_and_day).toBe("20170507");
    expect(episode_short_year_and_month_and_day).toBe("170507");
  });
});

function get_episodes_range(order: number) {
  const start = Math.floor(order / 20) * 20; // 计算下限
  return [start + 1, start + 20];
}
describe("获取剧集范围", () => {
  test("2", () => {
    const range = get_episodes_range(2);
    expect(range).toStrictEqual([1, 20]);
  });
  test("13", () => {
    const range = get_episodes_range(13);
    expect(range).toStrictEqual([1, 20]);
  });
  test("39", () => {
    const range = get_episodes_range(39);
    expect(range).toStrictEqual([21, 40]);
  });
  test("40", () => {
    const range = get_episodes_range(41);
    expect(range).toStrictEqual([41, 60]);
  });
  test("41", () => {
    const range = get_episodes_range(41);
    expect(range).toStrictEqual([41, 60]);
  });
  test("60", () => {
    const range = get_episodes_range(41);
    expect(range).toStrictEqual([41, 60]);
  });
});
function split_count_into_ranges(num: number, count: number) {
  if (count <= 0) {
    return [];
  }
  const ranges: [number, number][] = [];
  let start = 1;
  let end = 1;
  while (start <= count) {
    end = Math.min(start + num - 1, count);
    ranges.push([start, end]);
    start = end + 1;
  }
  if (ranges.length === 0) {
    return [];
  }
  const last_range = ranges[ranges.length - 1];
  const diff = last_range[1] - last_range[0] + 1;
  if (ranges.length > 1 && diff < 5) {
    const last_second_range = ranges[ranges.length - 2];
    return [...ranges.slice(0, ranges.length - 2), [last_second_range[0], last_second_range[1] + diff]];
  }
  return ranges;
}
describe("生成剧集范围", () => {
  test("1", () => {
    const range = split_count_into_ranges(20, 1);
    expect(range).toStrictEqual([[1, 1]]);
  });
  test("3", () => {
    const range = split_count_into_ranges(20, 3);
    expect(range).toStrictEqual([[1, 3]]);
  });
  test("5", () => {
    const range = split_count_into_ranges(20, 5);
    expect(range).toStrictEqual([[1, 5]]);
  });
  test("88", () => {
    const range = split_count_into_ranges(30, 88);
    expect(range).toStrictEqual([
      [1, 30],
      [31, 60],
      [61, 88],
    ]);
  });
  test("13", () => {
    const range = split_count_into_ranges(20, 13);
    expect(range).toStrictEqual([[1, 13]]);
  });
  test("39", () => {
    const range = split_count_into_ranges(20, 39);
    expect(range).toStrictEqual([
      [1, 20],
      [21, 39],
    ]);
  });
  test("41", () => {
    const range = split_count_into_ranges(20, 41);
    expect(range).toStrictEqual([
      [1, 20],
      [21, 41],
    ]);
  });
  test("43", () => {
    const range = split_count_into_ranges(20, 43);
    expect(range).toStrictEqual([
      [1, 20],
      [21, 43],
    ]);
  });
  test("45", () => {
    const range = split_count_into_ranges(20, 45);
    expect(range).toStrictEqual([
      [1, 20],
      [21, 40],
      [41, 45],
    ]);
  });
  test("46", () => {
    const range = split_count_into_ranges(20, 46);
    expect(range).toStrictEqual([
      [1, 20],
      [21, 40],
      [41, 46],
    ]);
  });
});

function find_missing_episodes(values: { count: number; episode_orders: number[] }) {
  const { count, episode_orders } = values;
  const missing_episodes: number[] = [];
  for (let i = 1; i <= count; i++) {
    if (!episode_orders.includes(i)) {
      missing_episodes.push(i);
    }
  }
  return missing_episodes;
}

describe("计算缺少的剧集", () => {
  test("1", () => {
    const range = find_missing_episodes({
      count: 42,
      episode_orders: [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
        32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
      ],
    });
    expect(range).toStrictEqual([10]);
  });
  test("2", () => {
    const range = find_missing_episodes({
      count: 3,
      episode_orders: [],
    });
    expect(range).toStrictEqual([1, 2, 3]);
  });
});

function fix_episode_group_by_missing_episodes(values: { missing_episodes: number[]; groups: [number, number][] }) {
  const { groups, missing_episodes } = values;
  const updated_groups: [number?, number?][] = [];
  if (missing_episodes.length === 0) {
    return groups;
  }
  for (let i = 0; i < groups.length; i += 1) {
    let [start, end] = groups[i];
    const range: number[] = [];
    for (let i = start; i < end + 1; i += 1) {
      if (!missing_episodes.includes(i)) {
        range.push(i);
      }
    }
    if (range.length === 0) {
      updated_groups.push([]);
      continue;
    }
    updated_groups.push([range[0], range[range.length - 1]]);
  }
  return updated_groups;
}

describe("根据缺少的剧集，修复剧集分组", () => {
  test("1", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [9, 10],
    });
    expect(range).toStrictEqual([
      [1, 8],
      [11, 20],
    ]);
  });
  test("2", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [4, 13],
    });
    expect(range).toStrictEqual([
      [1, 10],
      [11, 20],
    ]);
  });
  test("3", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    });
    expect(range).toStrictEqual([[], [11, 20]]);
  });
  test("4", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [1, 2, 3, 11, 12],
    });
    expect(range).toStrictEqual([
      [4, 10],
      [13, 20],
    ]);
  });
  test("5", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [8, 9, 10, 11, 12],
    });
    expect(range).toStrictEqual([
      [1, 7],
      [13, 20],
    ]);
  });
  test("6", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [],
    });
    expect(range).toStrictEqual([
      [1, 10],
      [11, 20],
    ]);
  });
  test("7", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [[1, 1]],
      missing_episodes: [],
    });
    expect(range).toStrictEqual([[1, 1]]);
  });
});

describe("版本号比较", () => {
  test("bugfix 版本比较", () => {
    const r = compare_versions_with_timestamp("0.0.2", "0.0.8");
    expect(r).toStrictEqual(-1);
  });
  test("小版本比较", () => {
    const r = compare_versions_with_timestamp("0.10.2", "0.2.8");
    expect(r).toStrictEqual(1);
  });
  test("大版本比较", () => {
    const r = compare_versions_with_timestamp("2.0.0", "1.10.100");
    expect(r).toStrictEqual(1);
  });
  test("版本号相同", () => {
    const r = compare_versions_with_timestamp("2.1.0", "2.1.0");
    expect(r).toStrictEqual(0);
  });
  test("日常发布版本", () => {
    const r = compare_versions_with_timestamp("2.1.0-2101212302", "2.1.0-2101212310");
    expect(r).toStrictEqual(-1);
  });
  test("日常发布版本", () => {
    const r = compare_versions_with_timestamp("2.1.0-2101212302", "2.2.0-2101212301");
    expect(r).toStrictEqual(-1);
  });
});

describe("构建名称", () => {
  test("MEGALO BOX", () => {
    const r = build_media_name({ name: "MEGALO BOX", original_name: null });
    expect(r).toStrictEqual("MEGALO BOX");
  });
});
