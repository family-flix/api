/**
 * @file 电影
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("电影", () => {
  test("Everything Everywhere All At Once.2022.UHD.Bluray.2160p.DV.HEVC.TrueHD 7.1.mkv", () => {
    const name = "Everything Everywhere All At Once.2022.UHD.Bluray.2160p.DV.HEVC.TrueHD 7.1.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Everything.Everywhere.All.At.Once",
      season: "",
      episode: "",
      // @todo 这个是什么意义
    });
  });

  test("Q 请回答1988蓝光版", () => {
    const name = "Q 请回答1988蓝光版";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "请回答1988",
      original_name: "",
      season: "",
      episode: "",
    });
  });

  test("玩具总动员4.mp4", () => {
    const name = "玩具总动员4.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "玩具总动员",
      original_name: "",
      season: "",
      episode: "E04",
    });
  });
  test("1990.傅艺伟. 封神榜 4K. 高清修复", () => {
    const name = "1990.傅艺伟. 封神榜 4K. 高清修复";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "封神榜",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("碟中谍7：致命清算（上）.mp4", () => {
    const name = "碟中谍7：致命清算（上）.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      // @todo
      name: "碟中谍7：致命清算",
      original_name: "",
      season: "",
      episode: "",
    });
  });
});
