/**
 * @file 各种带有「番外篇、特别篇」等，季 或者 集 不是正常数字
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("番外", () => {
  test("downloads/G 归路 (2023)(30集持续更新中)/4K", () => {
    const name = "downloads/G 归路 (2023)(30集持续更新中)/4K";
    const result = parse_filename_for_video(name, [
      "resolution",
      "source",
      "encode",
      "voice_encode",
      "voice_type",
      "type",
    ]);
    expect(result).toStrictEqual({
      resolution: "4K",
      source: "",
      encode: "",
      voice_encode: "",
      voice_type: "",
      type: "",
    });
  });
  test("01粤语.mp4", () => {
    const name = "01粤语.mp4";
    const result = parse_filename_for_video(name, [
      "resolution",
      "source",
      "encode",
      "voice_encode",
      "voice_type",
      "type",
    ]);
    expect(result).toStrictEqual({
      resolution: "",
      source: "",
      encode: "",
      voice_encode: "",
      voice_type: "粤语",
      type: ".mp4",
    });
  });
  test("01国语.mp4", () => {
    const name = "01国语.mp4";
    const result = parse_filename_for_video(name, [
      "resolution",
      "source",
      "encode",
      "voice_encode",
      "voice_type",
      "type",
    ]);
    expect(result).toStrictEqual({
      resolution: "",
      source: "",
      encode: "",
      voice_encode: "",
      voice_type: "国语",
      type: ".mp4",
    });
  });
});
