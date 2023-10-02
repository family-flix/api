/**
 * @file 各种带有「番外篇、特别篇」等，季 或者 集 不是正常数字
 */
import dayjs from "dayjs";
import { describe, expect, test } from "vitest";

describe("从数组中 find 元素", () => {
  test("有匹配的", () => {
    const arr = [
      {
        name: "红楼梦",
        first_air_date: "2010",
      },
      {
        name: "红楼梦",
        first_air_date: "1986",
      },
    ];
    const name = "红楼梦";
    const extra = {
      year: "1986",
    };
    const matched = arr.find((tv) => {
      if (tv.name === name) {
        if (extra.year && tv.first_air_date) {
          return dayjs(tv.first_air_date).year() === dayjs(extra.year).year();
        }
        return true;
      }
      return false;
    });
    expect(matched).toBeTruthy();
    expect(matched).toStrictEqual({
      name: "红楼梦",
      first_air_date: "1986",
    });
  });
  test("没匹配的", () => {
    const arr = [
      {
        name: "红楼梦",
        first_air_date: "2010",
      },
      {
        name: "红楼梦",
        first_air_date: "1986",
      },
    ];
    const name = "红楼梦";
    const extra = {
      year: "2003",
    };
    const matched = arr.find((tv) => {
      if (tv.name === name) {
        if (extra.year && tv.first_air_date) {
          return dayjs(tv.first_air_date).year() === dayjs(extra.year).year();
        }
        return true;
      }
      return false;
    });
    expect(matched).toBeFalsy();
  });
});
