/**
 * @file
 */
import { describe, expect, test } from "vitest";

import { build_media_name } from "../parse_filename_for_video";

describe("构建归档名称", () => {
  test("了不起的麦瑟尔夫人", () => {
    const result = build_media_name({
      name: "了不起的麦瑟尔夫人",
      original_name: "TheMarvelous Mrs. Maisel",
    });
    expect(result).toBe("L 了不起的麦瑟尔夫人.TheMarvelous.Mrs.Maisel");
  });
  test("9号秘事", () => {
    const result = build_media_name({
      name: "9号秘事",
      original_name: "InsideNo. 9",
    });
    expect(result).toBe("9号秘事.InsideNo.9");
  });
test("喂 帅哥！！", () => {
    const result = build_media_name({
      name: "喂 帅哥！！",
      original_name: "おいハンサム!!",
    });
    expect(result).toBe("W 喂帅哥！！.おいハンサム!!");
  });
});
