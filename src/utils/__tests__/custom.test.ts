/**
 * @file 自定义额外解析规则
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("自定义额外解析规则", () => {
  test("西游记.2000.E01.mkv", () => {
    const name = "西游记.2000.E01.mkv";
    const result = parse_filename_for_video(name, undefined, [
      {
        replace: ["(西游记).2000", "$1.S02"],
      },
    ]);
    expect(result).toStrictEqual({
      name: "西游记",
      original_name: "",
      season: "S02",
      episode: "E01",
    });
  });
  test("Top028.十二怒汉(CC标准收藏版).12.Angry.Men.1957.CC.Bluray.1080p.x265.AAC.GREENOTEA.mkv", () => {
    const name = "Top028.十二怒汉(CC标准收藏版).12.Angry.Men.1957.CC.Bluray.1080p.x265.AAC.GREENOTEA.mkv";
    const result = parse_filename_for_video(name, undefined, [
      {
        replace: ["12.Angry.Men", "ORIGINAL_NAME"],
      },
    ]);
    expect(result).toStrictEqual({
      name: "十二怒汉",
      original_name: "12.Angry.Men",
      season: "",
      episode: "",
    });
  });
  test("盾之勇者成名录 S1 (8).mkv", () => {
    const name = "盾之勇者成名录 S1 (8).mkv";
    const result = parse_filename_for_video(name, undefined, [
      {
        replace: ["盾之勇者成名录.S1.\\(([0-9]{1,})\\).mkv", "盾之勇者成名录.S1.E$1.mkv"],
      },
    ]);
    expect(result).toStrictEqual({
      name: "盾之勇者成名录",
      original_name: "",
      season: "S01",
      episode: "E08",
    });
  });
  test("西行纪之宿命篇20[1080P][KLWNH].mp4", () => {
    const name = "西行纪之宿命篇20[1080P][KLWNH].mp4";
    const result = parse_filename_for_video(name, undefined, [
      {
        replace: ["西行纪之宿命篇", "西行纪.S03."],
      },
    ]);
    expect(result).toStrictEqual({
      name: "西行纪",
      original_name: "",
      season: "S03",
      episode: "E20",
    });
  });
  test("悬吧猪栏2367电锯惊魂10.SAW X.2023.1080p.x265.yc.mkv", () => {
    const name = "悬吧猪栏2367电锯惊魂10.SAW X.2023.1080p.x265.yc.mkv";
    const result = parse_filename_for_video(name, undefined, [
      {
        replace: ["悬吧猪栏2367", "EMPTY"],
      },
    ]);
    expect(result).toStrictEqual({
      name: "电锯惊魂10",
      original_name: "SAW10",
      season: "",
      episode: "",
    });
  });
  test("十二公民[国语中字].12.Citizens.2014.2160p.WEB-DL.H265.AAC-BBQDDQ.mp4", () => {
    const name = "十二公民[国语中字].12.Citizens.2014.2160p.WEB-DL.H265.AAC-BBQDDQ.mp4";
    const result = parse_filename_for_video(name, undefined, [
      {
        replace: ["12.Citizens", "ORIGINAL_NAME"],
      },
    ]);
    expect(result).toStrictEqual({
      name: "十二公民",
      original_name: "12.Citizens",
      season: "",
      episode: "",
    });
  });
  test("S 三傻大闹宝莱坞.3.Idiots.2009", () => {
    const name = "S 三傻大闹宝莱坞.3.Idiots.2009";
    const result = parse_filename_for_video(name, undefined, [
      {
        replace: ["3.Idiots", "ORIGINAL_NAME"],
      },
    ]);
    expect(result).toStrictEqual({
      name: "三傻大闹宝莱坞",
      original_name: "3.Idiots",
      season: "",
      episode: "",
    });
  });
  test("[ANi] 如果 30 歲還是處男，似乎就能成為魔法師 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4", () => {
    const name = "[ANi] 如果 30 歲還是處男，似乎就能成為魔法師 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4";
    const result = parse_filename_for_video(name, undefined, [
      {
        replace: ["如果.30.歲還是處男，似乎就能成為魔法師", "NAME"],
      },
    ]);
    expect(result).toStrictEqual({
      name: "如果 30 歲還是處男，似乎就能成為魔法師",
      original_name: "",
      season: "",
      episode: "E01",
    });
  });
  test("9-1-1.lone.star.s04e17.1080p.web.h264-cakes.chs.eng.mp4", () => {
    const name = "9-1-1.lone.star.s04e17.1080p.web.h264-cakes.chs.eng.mp4";
    const result = parse_filename_for_video(name, undefined, [
      {
        replace: ["9-1-1.lone.star", "ORIGINAL_NAME"],
      },
    ]);
    expect(result).toStrictEqual({
      name: "",
      original_name: "9-1-1.lone.star",
      season: "S04",
      episode: "E17",
    });
  });
});
