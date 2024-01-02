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
});
