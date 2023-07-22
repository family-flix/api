/**
 * @file 特殊的集数
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("特殊的集数", () => {
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
});
