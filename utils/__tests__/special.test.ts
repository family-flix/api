/**
 * @file 各种带有「番外篇、特别篇」等
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../index";

describe("番外", () => {
  test("重启人生番外篇", () => {
    const name = "重启人生番外篇";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "重启人生",
      original_name: "",
      season: "番外篇",
      episode: "",
      episode_name: "",
    });
  });

  test("假面骑士圣刃续集", () => {
    const name = "假面骑士圣刃续集";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "假面骑士圣刃",
      original_name: "",
      season: "",
      episode: "续集",
      episode_name: "",
    });
  });

  test("假面骑士圣刃续集", () => {
    const name = "假面骑士圣刃续集";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "假面骑士圣刃",
      original_name: "",
      season: "",
      episode: "续集",
      episode_name: "",
    });
  });

  test("去有风的地方_彩蛋_1080P_Tacit0924.mp4", () => {
    const name = "去有风的地方_彩蛋_1080P_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "去有风的地方",
      original_name: "",
      season: "",
      episode: "彩蛋",
      episode_name: "",
    });
  });
  test("今生也是第一次_彩蛋.mp4", () => {
    const name = "今生也是第一次_彩蛋.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "今生也是第一次",
      original_name: "",
      season: "",
      episode: "彩蛋",
      episode_name: "",
    });
  });
  test("彩蛋.mp4", () => {
    const name = "彩蛋.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "彩蛋",
      episode_name: "",
    });
  });
  test("无间 彩蛋3 1080P(高清SDR)(1080344)_Tacit0924.mp4", () => {
    const name = "无间 彩蛋3 1080P(高清SDR)(1080344)_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "无间",
      original_name: "",
      season: "",
      episode: "彩蛋3",
      episode_name: "",
    });
  });
  test("花絮13 王蝉动捕演员刘珂君助力凡人修仙传特别篇.mp4", () => {
    const name = "花絮13 王蝉动捕演员刘珂君助力凡人修仙传特别篇.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "花絮13",
      episode_name: "王蝉动捕演员刘珂君助力凡人修仙传特别篇",
    });
  });
});
