/**
 * @file 各种带有「番外篇、特别篇」等，季 或者 集 不是正常数字
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("番外", () => {
  /** 只有季信息 */
  test("第一部", () => {
    const name = "第一部";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "第一部",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("Season 1", () => {
    const name = "Season 1";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "S01",
      episode: "",
    });
  });
  test("S02 1080P  (52集)", () => {
    const name = "S02 1080P  (52集)";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "S02",
      episode: "E52",
    });
  });
  /** 只有集信息 */
  test("36.mp4", () => {
    const name = "36.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E36",
    });
  });
  test("【22222abc.com】30.mkv", () => {
    const name = "【22222abc.com】30.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E30",
    });
  });
  test("15(2).mp4", () => {
    const name = "15(2).mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E15",
    });
  });
  test("28(1).mp4", () => {
    const name = "28(1).mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E28",
    });
  });
  test("10（1）.mp4", () => {
    const name = "10（1）.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E10",
    });
  });
  test("15_2.mp4", () => {
    const name = "15_2.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E15",
    });
  });
  test("01国语.mp4", () => {
    const name = "01国语.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E01",
    });
  });
  /** 只有集信息 */
  test("【百度云盘下载】35.mp4", () => {
    const name = "【百度云盘下载】35.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E35",
    });
  });
  test("粤语10", () => {
    const name = "粤语10";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E10",
    });
  });
  test("7.mp4", () => {
    const name = "7.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E07",
    });
  });
  test("【04】 .mp4", () => {
    const name = "【04】 .mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E04",
    });
  });
  test("08-4K.mp4", () => {
    const name = "08-4K.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E08",
    });
  });
  /** 各种其他信息，语言、分辨率等等 */
  test("外挂字幕", () => {
    const name = "外挂字幕";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("1080P国粤双语", () => {
    const name = "1080P国粤双语";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("1080P.外挂简中", () => {
    const name = "1080P.外挂简中";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("1080P官中压制", () => {
    const name = "1080P官中压制";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("1080P官中", () => {
    const name = "1080P官中";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("1080P超前完结", () => {
    const name = "1080P超前完结";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("1080P超前点映", () => {
    const name = "1080P超前点映";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("连续剧版", () => {
    const name = "连续剧版";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("4K高码率[单集6GB]", () => {
    const name = "4K高码率[单集6GB]";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("4K B站logo", () => {
    const name = "4K B站logo";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("4khq60fps.mp4", () => {
    const name = "4khq60fps.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("______.2013.1080p.BluRay.REMUX.AVC.DTS-HD.MA.5.1.mkv", () => {
    const name = "______.2013.1080p.BluRay.REMUX.AVC.DTS-HD.MA.5.1.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("前5季", () => {
    const name = "前5季";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
});
