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
  test("[电锯惊魂9].2021.2160p.UHD.BluRay.x265.10bit.HDR.DTS-HD.MA.TrueHD.7.1.Atmos-SWTYBLZ.mkv", () => {
    const name = "[电锯惊魂9].2021.2160p.UHD.BluRay.x265.10bit.HDR.DTS-HD.MA.TrueHD.7.1.Atmos-SWTYBLZ.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "电锯惊魂9",
      original_name: "UHD",
      season: "",
      episode: "",
    });
  });
  test("小城之春.1948.mp4", () => {
    const name = "小城之春.1948.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "小城之春",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("№099 7号房的礼物 [2013（中字）.mkv", () => {
    const name = "№099 7号房的礼物 [2013（中字）.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "7号房的礼物",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("W 喂帅哥！！.おいハンサム!!", () => {
    const name = "W 喂帅哥！！.おいハンサム!!";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "喂帅哥！！",
      original_name: "おいハンサム!!",
      season: "",
      episode: "",
    });
  });
  test("B 别叫我“赌神”.2023.4K..国语中字.mp4", () => {
    const name = "B 别叫我“赌神”.2023.4K..国语中字.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "别叫我“赌神”",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("2008.BURN-E.电焊工波力.HR-HDTV.AC3.1024X576.x264-人人影视制作.mkv", () => {
    const name = "2008.BURN-E.电焊工波力.HR-HDTV.AC3.1024X576.x264-人人影视制作.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("Im.Thinking.of.Ending.Things.2020.中文字幕.WEBrip.AAC.1080p.x264-VINEnc.mp4", () => {
    const name = "Im.Thinking.of.Ending.Things.2020.中文字幕.WEBrip.AAC.1080p.x264-VINEnc.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Im.Thinking.of.Ending.Things",
      season: "",
      episode: "",
    });
  });
  test("D-盗钥匙的方法.Remux", () => {
    const name = "D-盗钥匙的方法.Remux";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "盗钥匙的方法",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  //
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
