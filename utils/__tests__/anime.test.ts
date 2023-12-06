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
  test("斗罗大陆 第264话 4K(超高清SDR)90分钟大结局_Tacit0924 .mp4", () => {
    const name = "斗罗大陆 第264话 4K(超高清SDR)90分钟大结局_Tacit0924 .mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "斗罗大陆",
      original_name: "",
      season: "",
      episode: "E264",
    });
  });
  test("[ANi] 殭屍100～在成為殭屍前要做的100件事～ - 08 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4", () => {
    const name = "[ANi] 殭屍100～在成為殭屍前要做的100件事～ - 08 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "殭屍100～在成為殭屍前要做的100件事～",
      original_name: "",
      season: "",
      episode: "E08",
    });
  });
});
