/**
 * @file 国漫
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("国漫", () => {
  test("斗破苍穹年番 第18话 4K(超高清SDR) _Tacit0924.mp4", () => {
    const name = "斗破苍穹年番 第18话 4K(超高清SDR) _Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "斗破苍穹年番",
      original_name: "",
      season: "",
      episode: "E18",
    });
  });
  test("10重制版 凡人风起天南10_Tacit0924.mp4", () => {
    const name = "10重制版 凡人风起天南10_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E10",
    });
  });
  test("11重制版_Tacit0924.mp4", () => {
    const name = "11重制版_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E11",
    });
  });
});
