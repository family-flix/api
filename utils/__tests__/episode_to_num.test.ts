/**
 * 动漫
 */
import { describe, expect, test } from "vitest";

import { episode_to_num, season_to_num } from "../../utils";

describe("episode_to_num", () => {
  test("三位数", () => {
    const episode_number = "E112";
    const num = episode_to_num(episode_number);
    expect(num).toBe(112);
  });
  test("数字前面有0", () => {
    const episode_number = "E002";
    const num = episode_to_num(episode_number);
    expect(num).toBe(2);
  });
});

describe("season to number", () => {
  test("三位数", () => {
    const episode_number = "S112";
    const num = season_to_num(episode_number);
    expect(num).toBe(112);
  });
  test("数字前面有0", () => {
    const episode_number = "S002";
    const num = season_to_num(episode_number);
    expect(num).toBe(2);
  });
});
