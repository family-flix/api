import { describe, expect, test } from "vitest";

import {
  find_missing_episodes,
  fix_episode_group_by_missing_episodes,
  get_episodes_range,
  fix_missing_episodes,
  split_count_into_ranges,
} from "../utils";

describe("获取剧集范围", () => {
  test("2", () => {
    const range = get_episodes_range(2);
    expect(range).toStrictEqual([1, 20]);
  });
  test("13", () => {
    const range = get_episodes_range(13);
    expect(range).toStrictEqual([1, 20]);
  });
  test("39", () => {
    const range = get_episodes_range(39);
    expect(range).toStrictEqual([21, 40]);
  });
  test("40", () => {
    const range = get_episodes_range(41);
    expect(range).toStrictEqual([41, 60]);
  });
  test("41", () => {
    const range = get_episodes_range(41);
    expect(range).toStrictEqual([41, 60]);
  });
  test("60", () => {
    const range = get_episodes_range(41);
    expect(range).toStrictEqual([41, 60]);
  });
});

describe("生成剧集范围", () => {
  test("1", () => {
    const range = split_count_into_ranges(20, 1);
    expect(range).toStrictEqual([[1, 1]]);
  });
  test("3", () => {
    const range = split_count_into_ranges(20, 3);
    expect(range).toStrictEqual([[1, 3]]);
  });
  test("5", () => {
    const range = split_count_into_ranges(20, 5);
    expect(range).toStrictEqual([[1, 5]]);
  });
  test("88", () => {
    const range = split_count_into_ranges(30, 88);
    expect(range).toStrictEqual([
      [1, 30],
      [31, 60],
      [61, 88],
    ]);
  });
  test("13", () => {
    const range = split_count_into_ranges(20, 13);
    expect(range).toStrictEqual([[1, 13]]);
  });
  test("24", () => {
    const range = split_count_into_ranges(20, 24);
    expect(range).toStrictEqual([[1, 24]]);
  });
  test("39", () => {
    const range = split_count_into_ranges(20, 39);
    expect(range).toStrictEqual([
      [1, 20],
      [21, 39],
    ]);
  });
  test("41", () => {
    const range = split_count_into_ranges(20, 41);
    expect(range).toStrictEqual([
      [1, 20],
      [21, 41],
    ]);
  });
  test("43", () => {
    const range = split_count_into_ranges(20, 43);
    expect(range).toStrictEqual([
      [1, 20],
      [21, 43],
    ]);
  });
  test("45", () => {
    const range = split_count_into_ranges(20, 45);
    expect(range).toStrictEqual([
      [1, 20],
      [21, 40],
      [41, 45],
    ]);
  });
  test("46", () => {
    const range = split_count_into_ranges(20, 46);
    expect(range).toStrictEqual([
      [1, 20],
      [21, 40],
      [41, 46],
    ]);
  });
  test("770", () => {
    const range = split_count_into_ranges(20, 770);
    expect(range).toStrictEqual([
      [1, 20],
      [21, 40],
      [41, 60],
      [61, 80],
      [81, 100],
      [101, 120],
      [121, 140],
      [141, 160],
      [161, 180],
      [181, 200],
      [201, 220],
      [221, 240],
      [241, 260],
      [261, 280],
      [281, 300],
      [301, 320],
      [321, 340],
      [341, 360],
      [361, 380],
      [381, 400],
      [401, 420],
      [421, 440],
      [441, 460],
      [461, 480],
      [481, 500],
      [501, 520],
      [521, 540],
      [541, 560],
      [561, 580],
      [581, 600],
      [601, 620],
      [621, 640],
      [641, 660],
      [661, 680],
      [681, 700],
      [701, 720],
      [721, 740],
      [741, 760],
      [761, 770],
    ]);
  });
});

describe("计算缺少的剧集", () => {
  test("1", () => {
    const range = find_missing_episodes({
      count: 42,
      episode_orders: [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
        32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
      ],
    });
    expect(range).toStrictEqual([10]);
  });
  test("集数为空", () => {
    const range = find_missing_episodes({
      count: 3,
      episode_orders: [],
    });
    expect(range).toStrictEqual([1, 2, 3]);
  });
  test("缺少开始剧集", () => {
    const range = find_missing_episodes({
      count: 8,
      start: 1,
      episode_orders: [2, 3, 4, 6, 7, 8],
    });
    expect(range).toStrictEqual([1, 5]);
  });
  test("3", () => {
    const range = find_missing_episodes({
      count: 49,
      episode_orders: [1, 2, 3, 4, 5, 6],
    });
    expect(range).toStrictEqual([
      7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
      36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
    ]);
  });
});

describe("根据缺少的剧集，修复剧集分组", () => {
  test("1", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [9, 10],
    });
    expect(range).toStrictEqual([
      [1, 10],
      [11, 20],
    ]);
  });
  test("2", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [4, 13],
    });
    expect(range).toStrictEqual([
      [1, 10],
      [11, 20],
    ]);
  });
  test("3", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    });
    expect(range).toStrictEqual([[1, 10], [11, 20]]);
  });
  test("4", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [1, 2, 3, 11, 12],
    });
    expect(range).toStrictEqual([
      [1, 10],
      [11, 20],
    ]);
  });
  test("5", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [8, 9, 10, 11, 12],
    });
    expect(range).toStrictEqual([
      [1, 10],
      [11, 20],
    ]);
  });
  test("6", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [
        [1, 10],
        [11, 20],
      ],
      missing_episodes: [],
    });
    expect(range).toStrictEqual([
      [1, 10],
      [11, 20],
    ]);
  });
  test("7", () => {
    const range = fix_episode_group_by_missing_episodes({
      groups: [[1, 1]],
      missing_episodes: [],
    });
    expect(range).toStrictEqual([[1, 1]]);
  });
});

describe("补全缺少的剧集", () => {
  test("2", () => {
    const episodes = fix_missing_episodes({
      missing_episodes: [2],
      episodes: [
        {
          id: "",
          media_id: "",
          name: "第一集",
          overview: "",
          order: 1,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第三集",
          overview: "",
          order: 3,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第四集",
          overview: "",
          order: 4,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
      ],
    });
    expect(episodes).toStrictEqual([
      {
        id: "",
        media_id: "",
        name: "第一集",
        overview: "",
        order: 1,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "",
        overview: "",
        order: 2,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第三集",
        overview: "",
        order: 3,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第四集",
        overview: "",
        order: 4,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
    ]);
  });

  test("[5, 6]", () => {
    const episodes = fix_missing_episodes({
      missing_episodes: [5, 6],
      episodes: [
        {
          id: "",
          media_id: "",
          name: "第一集",
          overview: "",
          order: 1,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第二集",
          overview: "",
          order: 2,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第三集",
          overview: "",
          order: 3,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第四集",
          overview: "",
          order: 4,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
      ],
    });
    expect(episodes).toStrictEqual([
      {
        id: "",
        media_id: "",
        name: "第一集",
        overview: "",
        order: 1,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第二集",
        overview: "",
        order: 2,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第三集",
        overview: "",
        order: 3,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第四集",
        overview: "",
        order: 4,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "",
        overview: "",
        order: 5,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "",
        overview: "",
        order: 6,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
    ]);
  });
  test("[9, 10]", () => {
    const episodes = fix_missing_episodes({
      missing_episodes: [9, 10],
      episodes: [
        {
          id: "",
          media_id: "",
          name: "第一集",
          overview: "",
          order: 1,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第二集",
          overview: "",
          order: 2,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第三集",
          overview: "",
          order: 3,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第四集",
          overview: "",
          order: 4,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第五集",
          overview: "",
          order: 5,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第六集",
          overview: "",
          order: 6,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第七集",
          overview: "",
          order: 7,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第八集",
          overview: "",
          order: 8,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第11集",
          overview: "",
          order: 11,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
      ],
    });
    expect(episodes).toStrictEqual([
      {
        id: "",
        media_id: "",
        name: "第一集",
        overview: "",
        order: 1,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第二集",
        overview: "",
        order: 2,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第三集",
        overview: "",
        order: 3,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第四集",
        overview: "",
        order: 4,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第五集",
        overview: "",
        order: 5,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第六集",
        overview: "",
        order: 6,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第七集",
        overview: "",
        order: 7,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第八集",
        overview: "",
        order: 8,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "",
        overview: "",
        order: 9,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "",
        overview: "",
        order: 10,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第11集",
        overview: "",
        order: 11,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
    ]);
  });
  test("[1, 2]", () => {
    const episodes = fix_missing_episodes({
      missing_episodes: [1, 2],
      episodes: [
        {
          id: "",
          media_id: "",
          name: "第三集",
          overview: "",
          order: 3,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第四集",
          overview: "",
          order: 4,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第五集",
          overview: "",
          order: 5,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第六集",
          overview: "",
          order: 6,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第七集",
          overview: "",
          order: 7,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
        {
          id: "",
          media_id: "",
          name: "第八集",
          overview: "",
          order: 8,
          still_path: "",
          runtime: null,
          sources: [],
          subtitles: [],
        },
      ],
    });
    expect(episodes).toStrictEqual([
      {
        id: "",
        media_id: "",
        name: "",
        overview: "",
        order: 1,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "",
        overview: "",
        order: 2,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第三集",
        overview: "",
        order: 3,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第四集",
        overview: "",
        order: 4,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第五集",
        overview: "",
        order: 5,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第六集",
        overview: "",
        order: 6,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第七集",
        overview: "",
        order: 7,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
      {
        id: "",
        media_id: "",
        name: "第八集",
        overview: "",
        order: 8,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      },
    ]);
  });
});
