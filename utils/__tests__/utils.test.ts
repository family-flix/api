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
