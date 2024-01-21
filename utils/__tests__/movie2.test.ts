/**
 * @file
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("电影", () => {
  test("大蛇4.mp4", () => {
    const name = "大蛇4.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "大蛇4",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("《壮志凌云》1936.老片修复版.mp4", () => {
    const name = "《壮志凌云》1936.老片修复版.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "壮志凌云",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("Leon.The.Professional.1994.mkv", () => {
    const name = "Leon.The.Professional.1994.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Leon.The.Professional",
      season: "",
      episode: "",
    });
  });
  test("画江湖之天罡 (2023) - The.Legend.2023.2160p.WEB-DL.H265.DV.DDP2.0.mp4", () => {
    const name = "画江湖之天罡 (2023) - The.Legend.2023.2160p.WEB-DL.H265.DV.DDP2.0.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "画江湖之天罡",
      original_name: "The.Legend",
      season: "",
      episode: "",
    });
  });
  // test("up.2009.飞屋环游记.双语字幕.国英音轨.hr-hdtv.ac3.1024x576.x264-人人影视制作.mkv", () => {
  //   const name = "up.2009.飞屋环游记.双语字幕.国英音轨.hr-hdtv.ac3.1024x576.x264-人人影视制作.mkv";
  //   const result = parse_filename_for_video(name);
  //   expect(result).toStrictEqual({
  //     name: "飞屋环游记",
  //     original_name: "",
  //     season: "",
  //     episode: "",
  //   });
  // });
});