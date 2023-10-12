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
        replace: ["12.Angry.Men", "{{12.Angry.Men}}"],
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
});
