/**
 * @file 国漫
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("电视剧4", () => {
  test("[Tracer][S2E01修正][双语特效1080P][小玩剧字幕组].mp4", () => {
    const name = "[Tracer][S2E01修正][双语特效1080P][小玩剧字幕组].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "S02",
      episode: "E01",
    });
  });
  test("Unforgettable.S310.mkv", () => {
    // @todo 没有剧集，将 季 认为是序号，拼接在名字后面
    const name = "Unforgettable.S310.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Unforgettable310",
      season: "",
      episode: "",
    });
  });
});
