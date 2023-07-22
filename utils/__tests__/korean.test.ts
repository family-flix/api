/**
 * @file 韩语影视剧
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("韩语影视剧", () => {
  test("Q 请回答1988.응답하라1988.S01E12.2015.1080P.MKV", () => {
    const name = "Q 请回答1988.응답하라1988.S01E12.2015.1080P.MKV";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "请回答1988",
      original_name: "응답하라1988",
      season: "S01",
      episode: "E12",
    });
  });
});
