/**
 * @file 课程
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("课程", () => {
  //   test("02-01.六级核心词汇1.mp4", () => {
  //     const name = "02-01.六级核心词汇1.mp4";
  //     const result = parse_filename_for_video(name);
  //     expect(result).toStrictEqual({
  //       name: "六级核心词汇1",
  //       original_name: "",
  //       season: "",
  //       episode: "E02",
  //     });
  //   });
  test("【B站】英语六级CET6全程班", () => {
    const name = "【B站】英语六级CET6全程班";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "英语六级CET6全程班",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test.skip("E01.六级导学课.mp4", () => {
    const name = "E01.六级导学课.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E01",
    });
  });
  test("E25.仔细阅读passage6解析.mp4", () => {
    const name = "E25.仔细阅读passage6解析.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E25",
    });
  });
});
