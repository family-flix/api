/**
 * @file 获取影视剧播放信息
 */
import { describe, expect, test } from "vitest";

import { Member } from "@/domains/user/member";
import { MediaTypes } from "@/constants/index";

import { Media } from "../index";
import { DataStore } from "../../store/types";
import { User } from "../../user";

describe("获取指定影视剧播放信息", () => {
  test("28集、缺少 24,25、首次播放", async () => {
    const store: DataStore = {
      prisma: {
        media: {
          // @ts-ignore
          findFirst(args) {
            return {
              id: "media_id",
              profile: {
                name: "微暗之火",
                source_count: 28,
                origin_country: [],
                genres: [],
              },
            };
          },
        },
        media_source: {
          // @ts-ignore
          findFirst(args) {
            return {
              id: "media_source",
              profile: {
                order: 28,
              },
            };
          },
          // @ts-ignore
          findMany(args) {
            return [
              ...Array(
                (() => {
                  if (args && args.select) {
                    return 28;
                  }
                  return 20;
                })()
              ),
            ]
              .map((_, i) => {
                if ([23, 24].includes(i)) {
                  return null;
                }
                return {
                  id: String(i + 1),
                  profile: {
                    name: `第${i + 1}集`,
                    order: i + 1,
                  },
                  subtitles: [],
                  files: [
                    {
                      id: "1",
                      name: "file",
                      file_name: "file_1",
                      file_id: "",
                      drive: {
                        name: "drive",
                      },
                    },
                  ],
                };
              })
              .filter(Boolean);
          },
        },
        play_history_v2: {
          // @ts-ignore
          findFirst(args) {
            return null;
          },
        },
      },
    };
    const user = new User({ id: "", token: "", store });
    const member = new Member({ id: "", remark: "", email: "", token: "", permissions: [], user, store });
    const media_id = "xxx";
    const type = MediaTypes.Season;
    const r = await Media.Get({ id: media_id, type, member, store });
    expect(r.error).toBe(null);
    if (r.error) {
      console.log(r.error.message);
      return;
    }
    const media = r.data;
    const r2 = await media.fetch_playing_info();
    expect(r2.error).toBe(null);
    if (r2.error) {
      console.log(r2.error.message);
      return;
    }
    expect(r2.data).toStrictEqual({
      id: media_id,
      name: "微暗之火",
      overview: undefined,
      poster_path: undefined,
      air_date: undefined,
      source_count: 28,
      vote_average: undefined,
      cur_source: {
        id: "1",
        order: 1,
        index: 0,
        current_time: 0,
        cur_source_file_id: "1",
        thumbnail_path: undefined,
        subtitles: [],
        files: [
          {
            id: "1",
            name: "file",
            file_name: "file_1",
          },
        ],
      },
      genres: [],
      origin_country: [],
      sources: [...Array(20)].map((_, i) => {
        return {
          id: String(i + 1),
          name: `第${i + 1}集`,
          overview: undefined,
          order: i + 1,
          runtime: undefined,
          media_id,
          still_path: undefined,
          sources: [
            {
              id: "1",
              file_name: "file_1",
              parent_paths: undefined,
            },
          ],
          subtitles: [],
        };
      }),
      source_groups: [
        {
          start: 1,
          end: 20,
        },
        {
          start: 21,
          end: 28,
        },
      ],
    });
  });

  test("21集、首次播放", async () => {
    const store: DataStore = {
      prisma: {
        media: {
          // @ts-ignore
          findFirst(args) {
            return {
              id: "media_id",
              profile: {
                name: "春色寄情人",
                source_count: 21,
                origin_country: [],
                genres: [],
              },
            };
          },
        },
        media_source: {
          // @ts-ignore
          findFirst(args) {
            return {
              id: "media_source",
              profile: {
                order: 21,
              },
            };
          },
          // @ts-ignore
          findMany(args) {
            return [
              ...Array(
                (() => {
                  if (args && args.select) {
                    return 21;
                  }
                  return 20;
                })()
              ),
            ]
              .map((_, i) => {
                return {
                  id: String(i + 1),
                  profile: {
                    name: `第${i + 1}集`,
                    order: i + 1,
                  },
                  subtitles: [],
                  files: [
                    {
                      id: "1",
                      name: "file",
                      file_name: "file_1",
                      file_id: "",
                      drive: {
                        name: "drive",
                      },
                    },
                  ],
                };
              })
              .filter(Boolean);
          },
        },
        play_history_v2: {
          // @ts-ignore
          findFirst(args) {
            return null;
          },
        },
      },
    };
    const user = new User({ id: "", token: "", store });
    const member = new Member({ id: "", remark: "", email: "", token: "", permissions: [], user, store });
    const media_id = "xxx";
    const type = MediaTypes.Season;
    const r = await Media.Get({ id: media_id, type, member, store });
    expect(r.error).toBe(null);
    if (r.error) {
      console.log(r.error.message);
      return;
    }
    const media = r.data;
    const r2 = await media.fetch_playing_info();
    expect(r2.error).toBe(null);
    if (r2.error) {
      console.log(r2.error.message);
      return;
    }
    expect(r2.data).toStrictEqual({
      id: media_id,
      name: "春色寄情人",
      overview: undefined,
      poster_path: undefined,
      air_date: undefined,
      source_count: 21,
      vote_average: undefined,
      cur_source: {
        id: "1",
        order: 1,
        index: 0,
        current_time: 0,
        cur_source_file_id: "1",
        thumbnail_path: undefined,
        subtitles: [],
        files: [
          {
            id: "1",
            name: "file",
            file_name: "file_1",
          },
        ],
      },
      genres: [],
      origin_country: [],
      sources: [...Array(20)].map((_, i) => {
        return {
          id: String(i + 1),
          name: `第${i + 1}集`,
          overview: undefined,
          order: i + 1,
          runtime: undefined,
          media_id,
          still_path: undefined,
          sources: [
            {
              id: "1",
              file_name: "file_1",
              parent_paths: undefined,
            },
          ],
          subtitles: [],
        };
      }),
      source_groups: [
        {
          start: 1,
          end: 21,
        },
      ],
    });
  });
});
