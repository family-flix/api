/**
 * @file 综艺
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("提取综艺信息", () => {
  test("20240203期 加更版：好6团两周年庆生.mp4", () => {
    const name = "20240203期 加更版：好6团两周年庆生.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20240203",
    });
  });
  test("2022年12月17期：彭冠英猜“王鹤棣抓鸡”引爆笑 檀健次猜歌紧张到嘴抖.mp4", () => {
    const name = "2022年12月17期：彭冠英猜“王鹤棣抓鸡”引爆笑 檀健次猜歌紧张到嘴抖.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20221217",
    });
  });
  test("第 2023-12-24 期 好六看好剧：李现任敏激烈辩论.mp4", () => {
    const name = "第 2023-12-24 期 好六看好剧：李现任敏激烈辩论.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20231224",
    });
  });
  test("20240330 期 孙千直球式表白陈靖可.mp4", () => {
    const name = "20240330 期 孙千直球式表白陈靖可.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20240330",
    });
  });
  test("20240113期 好六年度颁奖大会.mp4", () => {
    const name = "20240113期 好六年度颁奖大会.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20240113",
    });
  });
//   test("2024-04-08期 特别企划：十个勤天嗨逛好六街.mp4", () => {
//     const name = "2024-04-08期 特别企划：十个勤天嗨逛好六街.mp4";
//     const result = parse_filename_for_video(name);
//     expect(result).toStrictEqual({
//       name: "",
//       original_name: "",
//       season: "",
//       episode: "20240408",
//     });
//   });
});
