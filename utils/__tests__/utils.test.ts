/**
 * @file 工具方法
 */
import { describe, expect, test } from "vitest";

import { season_to_chinese_num } from "..";

describe("季 转中文描述", () => {
  test("两位数", () => {
    const name = "S10";
    const result = season_to_chinese_num(name);
    expect(result).toStrictEqual("第十季");
  });
});
