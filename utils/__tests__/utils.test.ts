/**
 * @file 工具方法
 */
import { describe, expect, test } from "vitest";
import dayjs from "dayjs";

import { season_to_chinese_num } from "..";

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
  return [start, start + 20];
}
describe("获取剧集范围", () => {
  test("2", () => {
    const range = get_episodes_range(2);
    expect(range).toStrictEqual([0, 20]);
  });
  test("13", () => {
    const range = get_episodes_range(13);
    expect(range).toStrictEqual([0, 20]);
  });
  test("39", () => {
    const range = get_episodes_range(39);
    expect(range).toStrictEqual([20, 40]);
  });
  test("41", () => {
    const range = get_episodes_range(41);
    expect(range).toStrictEqual([40, 60]);
  });
});
function split_count_into_ranges(num: number, count: number) {
  const ranges: [number, number][] = [];
  let start = 1;
  let end = 1;
  while (end < count) {
    end = Math.min(start + num - 1, count);
    ranges.push([start, end]);
    start = end + 1;
  }
  const last_range = ranges[ranges.length - 1];
  if (!last_range) {
    return [];
  }
  const diff = last_range[1] - last_range[0] + 1;
  if (diff <= 5) {
    const last_second_range = ranges[ranges.length - 2];
    return [...ranges.slice(0, ranges.length - 2), [last_second_range[0], last_second_range[1] + diff]];
  }
  return ranges;
}
describe("生成剧集范围", () => {
  test("1", () => {
    const range = split_count_into_ranges(20, 1);
    expect(range).toStrictEqual([]);
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
      [21, 45],
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
