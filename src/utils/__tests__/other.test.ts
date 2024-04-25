import dayjs from "dayjs";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

import { add_zeros, bytes_to_size, normalize_episode_text, relative_time_from_now } from "..";
import { is_japanese, format_season_number } from "../parse_filename_for_video";

// describe("tv is changed", () => {
//   test("empty name to has value", () => {
//     const prev_tv = {
//       name: "",
//       original_name: "hello",
//     };
//     const tv = {
//       name: "name",
//       original_name: "hello",
//     };
//     const result = is_tv_changed(prev_tv, tv);
//     expect(result).toBe(true);
//   });

//   test("empty to empty", () => {
//     const prev_tv = {
//       name: "",
//       original_name: "hello",
//     };
//     const tv = {
//       name: "",
//       original_name: "hello",
//     };
//     const result = is_tv_changed(prev_tv, tv);
//     expect(result).toBe(false);
//   });

//   test("value be clear", () => {
//     const prev_tv = {
//       name: "name",
//       original_name: "hello",
//     };
//     const tv = {
//       name: "",
//       original_name: "hello",
//     };
//     const result = is_tv_changed(prev_tv, tv);
//     expect(result).toBe(true);
//   });

//   test("value changed", () => {
//     const prev_tv = {
//       name: "name",
//       original_name: "hello",
//     };
//     const tv = {
//       name: "name1",
//       original_name: "hello",
//     };
//     const result = is_tv_changed(prev_tv, tv);
//     expect(result).toBe(true);
//   });

//   test("1", () => {
//     const prev_tv = {
//       created: "2023-02-14T16:05:14.665Z",
//       id: "f9hbsDUwbd62779",
//       name: "人民的名义1",
//       original_name: "",
//       updated: "2023-02-14T16:05:14.665Z",
//       file_id: "63dc95304907e259afa849ec957930065d3bfd26",
//       file_name: "人民的名义1.4K（2017）",
//       user_id: "",
//       tv_profile_id: "",
//     };
//     const tv = {
//       name: "人民的名义",
//       original_name: "",
//     };
//     const result = is_tv_changed(prev_tv, tv);
//     expect(result).toBe(true);
//   });
// });

describe("normalize episode number", () => {
  test('".03.', () => {
    const name = ".03.";
    const result = normalize_episode_text(name);
    expect(result).toBe(".E03.");
  });
  test(".40.一天一夜（下）.", () => {
    const name = ".40.一天一夜（下）.";
    const result = normalize_episode_text(name);
    expect(result).toBe(".E40.一天一夜（下）.");
  });
  test(".24.", () => {
    const name = ".24.";
    const result = normalize_episode_text(name);
    expect(result).toBe(".E24.");
  });
  test("15.2.", () => {
    const name = "15.2.";
    const result = normalize_episode_text(name);
    expect(result).toBe(".E15.2.");
  });
});

describe("unit convert", () => {
  test("should be mb", () => {
    const r = bytes_to_size(1024 * 1024);
    expect(r).toBe("1MB");
  });
  test("should be KB", () => {
    const r = bytes_to_size(1024 * 512);
    expect(r).toBe("512KB");
  });
  test("should be MB", () => {
    const r = bytes_to_size(1024 * 1024 * 5.2);
    expect(r).toBe("5.2MB");
  });
  test("should be MB", () => {
    const r = bytes_to_size(1024 * 1024 * 5.225);
    expect(r).toBe("5.22MB");
  });
  test("should be MB", () => {
    const r = bytes_to_size(1024 * 1024 * 1024 * 1024 * 0.5);
    expect(r).toBe("512GB");
  });
  test("should be TB", () => {
    const r = bytes_to_size(9440338116608);
    expect(r).toBe("8.59TB");
  });
  test("should be 0KB", () => {
    const r = bytes_to_size(0);
    expect(r).toBe("0KB");
  });
});

describe.skip("split to multiple folder", () => {
  test("only one folder", () => {
    const folders = [
      "root/华灯初上/华灯初上.1-3.2021.1080P内嵌+NF内封多国字幕/华灯初上.S01.1080P.NF.内封简繁英字幕.纯净版",
      "root/华灯初上/华灯初上.1-3.2021.1080P内嵌+NF内封多国字幕/1-3季.内嵌简中版/S01",
      "root/华灯初上/华灯初上.1-3.2021.1080P内嵌+NF内封多国字幕/1-3季.内封字幕.1080P/Season1",
      "root/华灯初上/华灯初上.1-3.2021.1080P内嵌+NF内封多国字幕/华灯初上.S02.1080P.NF.内封简繁字幕.纯净版",
      "root/华灯初上/华灯初上.1-3.2021.1080P内嵌+NF内封多国字幕/1-3季.内嵌简中版/S02",
      "root/华灯初上/华灯初上.1-3.2021.1080P内嵌+NF内封多国字幕/1-3季.内封字幕.1080P/Season2",
      "root/华灯初上/华灯初上.1-3.2021.1080P内嵌+NF内封多国字幕/华灯初上.S03.1080P.NF.内封简繁字幕.纯净版",
      "root/华灯初上/华灯初上.1-3.2021.1080P内嵌+NF内封多国字幕/1-3季.内嵌简中版/S03",
      "root/华灯初上/华灯初上.1-3.2021.1080P内嵌+NF内封多国字幕/1-3季.内封字幕.1080P/Season3",
    ];
    // const data_source =
  });
});

describe("get relative time", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const now = new Date(2023, 3, 8, 12, 0, 0);
    vi.setSystemTime(now);
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  test("minute", () => {
    const updated = new Date(2023, 3, 8, 11, 58, 0);
    const result = relative_time_from_now(dayjs(updated).toISOString());
    expect(result).toBe("2分钟前");
  });
  test("hour", () => {
    const updated = new Date(2023, 3, 8, 10, 58, 0);
    const result = relative_time_from_now(dayjs(updated).toISOString());
    expect(result).toBe("1小时前");
  });
  test("day1", () => {
    const updated = new Date(2023, 3, 7, 10, 58, 0);
    const result = relative_time_from_now(dayjs(updated).toISOString());
    expect(result).toBe("1天前");
  });
  test("day2", () => {
    const updated = new Date(2023, 3, 7, 18, 58, 0);
    const result = relative_time_from_now(dayjs(updated).toISOString());
    expect(result).toBe("17小时前");
  });
  test("day3", () => {
    const updated = new Date(2023, 3, 4, 18, 58, 0);
    const result = relative_time_from_now(dayjs(updated).toISOString());
    expect(result).toBe("3天前");
  });
  test("day4", () => {
    const updated = new Date(2023, 3, 4, 10, 58, 0);
    const result = relative_time_from_now(dayjs(updated).toISOString());
    expect(result).toBe("4天前");
  });
  test("long before", () => {
    const updated = new Date(2022, 3, 4, 18, 58, 0);
    const result = relative_time_from_now(dayjs(updated).toISOString());
    expect(result).toBe("7天前");
  });
});

describe("is japanese", () => {
  test("最後のマジカル大戦", () => {
    const name = "最後のマジカル大戦";
    const is = is_japanese(name);
    expect(is).toBe(true);
  });
  test("龙珠GT", () => {
    const name = "龙珠GT";
    const is = is_japanese(name);
    expect(is).toBe(false);
  });
});

describe("format_number", () => {
  test("E003", () => {
    const episode_text = "E003";
    const result = format_season_number(episode_text, "E");
    expect(result).toBe("E03");
  });
});

describe("补全位数", () => {
  test("1位数", () => {
    const num = 1;
    const r = add_zeros(num, 5);
    expect(r).toBe(`0000${num}`);
  });
  test("5位数", () => {
    const num = 12345;
    const r = add_zeros(num, 5);
    expect(r).toBe(`${num}`);
  });
  test("6位数", () => {
    const num = 123456;
    const r = add_zeros(num, 5);
    expect(r).toBe(`${num}`);
  });
});
