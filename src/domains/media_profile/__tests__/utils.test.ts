/**
 * @file
 */
import { describe, expect, test } from "vitest";

import { format_season_name } from "../utils";

describe("格式化 season name", () => {
  test("第 1 季", () => {
    const result = format_season_name("第 1 季", { name: "请回答1988" });
    expect(result).toStrictEqual("请回答1988");
  });
  test("季 1", () => {
    const result = format_season_name("季 1", { name: "请回答1988" });
    expect(result).toStrictEqual("请回答1988");
  });
});
