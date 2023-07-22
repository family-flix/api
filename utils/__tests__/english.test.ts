/**
 * @file 英语影视剧
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("英语影视剧", () => {
  test("【熟肉-花絮】Transformers.2.BONUS.2009.HR-HDTV.AC3.1024X576.x264.mkv", () => {
    const name = "【熟肉-花絮】Transformers.2.BONUS.2009.HR-HDTV.AC3.1024X576.x264.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Transformers.2",
      season: "",
      episode: "BONUS",
    });
  });
  test("天鹅挽歌.House.M.D.S08end.Sp.2012.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv", () => {
    const name = "天鹅挽歌.House.M.D.S08end.Sp.2012.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "天鹅挽歌",
      original_name: "House.M.D",
      season: "S08",
      episode: "",
    });
  });
});
