/**
 * @file 国漫
 */
import { describe, expect, test } from "vitest";

import { get_first_letter } from "../index";

describe("国漫", () => {
  test("斗", () => {
    const name = "斗";
    const result = get_first_letter(name);
    expect(result).toStrictEqual("D");
  });
  test("为", () => {
    const name = "为";
    const result = get_first_letter(name);
    expect(result).toStrictEqual("W");
  });
  test("无", () => {
    const name = "无";
    const result = get_first_letter(name);
    expect(result).toStrictEqual("W");
  });
  test("1", () => {
    const name = "1";
    const result = get_first_letter(name);
    expect(result).toStrictEqual(null);
  });
  test("数字 1", () => {
    const name = 1;
    const result = get_first_letter(name);
    expect(result).toStrictEqual(null);
  });
  test("韩文 1", () => {
    const name = "응답하라";
    const result = get_first_letter(name);
    expect(result).toStrictEqual(null);
  });
  test("日文 1", () => {
    const name = "かけら";
    const result = get_first_letter(name);
    expect(result).toStrictEqual(null);
  });
  test("英文 1", () => {
    const name = "A";
    const result = get_first_letter(name);
    expect(result).toStrictEqual(null);
  });
  test("72小时黄金行动", () => {
    const name = "72小时黄金行动";
    const result = get_first_letter(name);
    expect(result).toStrictEqual(null);
  });
});
