/**
 * @file 各种带有「番外篇、特别篇」等，季 或者 集 不是正常数字
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("字幕", () => {
  test("Game.of.Thrones.S06E05.The.Door.2160p.BluRay.x265.10bit.SDR.DTS-HD.MA.TrueHD.7.1.Atmos-SWTYBLZ.zh.ass", () => {
    const name =
      "Game.of.Thrones.S06E05.The.Door.2160p.BluRay.x265.10bit.SDR.DTS-HD.MA.TrueHD.7.1.Atmos-SWTYBLZ.zh.ass";
    const result = parse_filename_for_video(name, ["name", "original_name", "season", "episode", "subtitle_lang"]);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Game.of.Thrones",
      season: "S06",
      episode: "E05",
      subtitle_lang: "chi",
    });
  });
  test("BITCH.X.RICH.S01E01.1080p.WEB-DL.AAC2.0.H.264-Taengoo.FRIDAY.CHS.SRT", () => {
    const name = "BITCH.X.RICH.S01E01.1080p.WEB-DL.AAC2.0.H.264-Taengoo.FRIDAY.CHS.SRT";
    const result = parse_filename_for_video(name, ["name", "original_name", "season", "episode", "subtitle_lang"]);
    expect(result).toStrictEqual({
      name: "",
      original_name: "BITCH.X.RICH",
      season: "S01",
      episode: "E01",
      subtitle_lang: "chi",
    });
  });
  test("BITCH.X.RICH.S01E01.1080p.WEB-DL.AAC2.0.H.264-Taengoo.VIU.CHT.SRT", () => {
    const name = "BITCH.X.RICH.S01E01.1080p.WEB-DL.AAC2.0.H.264-Taengoo.VIU.CHT.SRT";
    const result = parse_filename_for_video(name, ["name", "original_name", "season", "episode", "subtitle_lang"]);
    expect(result).toStrictEqual({
      name: "",
      original_name: "BITCH.X.RICH",
      season: "S01",
      episode: "E01",
      subtitle_lang: "cht",
    });
  });
  test("银河护卫队3 (2023) - Guardians.of.the.Galaxy.Vol.3.2023.1080p.WEB-DL.DDP5.1.Atmos.H.264-CMRG.chs&eng.ass", () => {
    const name =
      "银河护卫队3 (2023) - Guardians.of.the.Galaxy.Vol.3.2023.1080p.WEB-DL.DDP5.1.Atmos.H.264-CMRG.chs&eng.ass";
    const result = parse_filename_for_video(name, ["name", "original_name", "season", "episode", "subtitle_lang"]);
    expect(result).toStrictEqual({
      name: "银河护卫队",
      original_name: "",
      season: "S03",
      episode: "",
      subtitle_lang: "chs&eng",
    });
  });
  test("雷霆沙赞！众神之怒.Shazam.Fury.of.the.Gods.2023.chi&eng.srt", () => {
    const name = "雷霆沙赞！众神之怒.Shazam.Fury.of.the.Gods.2023.chi&eng.srt";
    const result = parse_filename_for_video(name, ["name", "original_name", "season", "episode", "subtitle_lang"]);
    expect(result).toStrictEqual({
      name: "雷霆沙赞！众神之怒",
      original_name: "Shazam.Fury.of.the.Gods",
      season: "",
      episode: "",
      subtitle_lang: "chi&eng",
    });
  });
});
