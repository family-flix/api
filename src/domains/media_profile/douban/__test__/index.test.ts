/**
 * @file
 */
import { describe, expect, test } from "vitest";

import { split_name_and_original_name } from "../utils";

describe("豆瓣搜索到的名称进行处理", () => {
  test("周游记 第二季", () => {
    const name = "周游记 第二季";
    const result = split_name_and_original_name(name);
    expect(result).toStrictEqual({
      name: "周游记 第二季",
      origin_name: null,
    });
  });
  test("姜食堂 第二季 강식당  시즌2", () => {
    const name = "姜食堂 第二季 강식당  시즌2";
    const result = split_name_and_original_name(name);
    expect(result).toStrictEqual({
      name: "姜食堂 第二季",
      origin_name: "강식당  시즌2",
    });
  });
  test("地心历险记2：神秘岛 Journey 2: The Mysterious Island", () => {
    const name = "地心历险记2：神秘岛 Journey 2: The Mysterious Island";
    const result = split_name_and_original_name(name);
    expect(result).toStrictEqual({
      name: "地心历险记2：神秘岛",
      origin_name: "Journey 2: The Mysterious Island",
    });
  });
  test("最游记 RELOAD 最遊記RELOAD", () => {
    const name = "最游记 RELOAD 最遊記RELOAD";
    const result = split_name_and_original_name(name);
    expect(result).toStrictEqual({
      name: "最游记",
      origin_name: "RELOAD 最遊記RELOAD",
    });
  });
});
