/**
 * @file 纯享、去片头片尾 等这些，属于正片，但又进行了处理
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("额外文件信息", () => {
  test("20230909第5期纯享_Tacit0924.mp4", () => {
    const name = "20230909第5期纯享_Tacit0924.mp4";
    const result = parse_filename_for_video(name, ["name", "original_name", "season", "episode", "extra1"]);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20230909",
      extra1: "纯享版",
    });
  });
  test("风起洛阳.EP03.4K.去片头片尾.mp4", () => {
    const name = "风起洛阳.EP03.4K.去片头片尾.mp4";
    const result = parse_filename_for_video(name, ["name", "original_name", "season", "episode", "extra1"]);
    expect(result).toStrictEqual({
      name: "风起洛阳",
      original_name: "",
      season: "",
      episode: "E03",
      extra1: "纯享版",
    });
  });
  test("晓敏家.4K纯享版.EP35.mp4", () => {
    const name = "晓敏家.4K纯享版.EP35.mp4";
    const result = parse_filename_for_video(name, ["name", "original_name", "season", "episode", "extra1"]);
    expect(result).toStrictEqual({
      name: "晓敏家",
      original_name: "",
      season: "",
      episode: "E35",
      extra1: "纯享版",
    });
  });

  test("奔跑吧黄河篇 - S01E06 - WEB1080P.20210110.新年派对.加长版.mp4", () => {
    const name = "奔跑吧黄河篇 - S01E06 - WEB1080P.20210110.新年派对.加长版.mp4";
    const result = parse_filename_for_video(name, ["name", "original_name", "season", "episode", "extra1", "extra2"]);
    expect(result).toStrictEqual({
      name: "奔跑吧黄河篇",
      original_name: "",
      season: "S01",
      episode: "E06",
      extra1: "",
      extra2: "加长版",
    });
  });
  test("20220430第1期plus版_Tacit0924.mp4", () => {
    const name = "20220430第1期plus版_Tacit0924.mp4";
    const result = parse_filename_for_video(name, ["name", "original_name", "season", "episode", "extra1", "extra2"]);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20220430",
      extra1: "",
      extra2: "plus版",
    });
  });
  test("无痛杀手.S01E03.HD1080P.官方中字.mp4", () => {
    const name = "无痛杀手.S01E03.HD1080P.官方中字.mp4";
    const result = parse_filename_for_video(name, ["name", "original_name", "season", "episode", "type"]);
    expect(result).toStrictEqual({
      name: "无痛杀手",
      original_name: "",
      season: "S01",
      episode: "E03",
      type: ".mp4",
    });
  });
});
