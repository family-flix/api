/**
 * @file 电影
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../index";

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
      episode_name: "UHD",
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
      episode_name: "",
    });
  });
});
