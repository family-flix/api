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
            if (args && args.select) {
              return [...Array(28)].map((_, i) => {
                return {
                  profile: {
                    order: i + 1,
                  },
                };
              });
            }
            return [...Array(20)]
              .map((_, i) => {
                const base = 0;
                const order = base + i + 1;
                if ([24, 25].includes(order)) {
                  return null;
                }
                return {
                  id: String(order),
                  profile: {
                    name: `第${order}集`,
                    order,
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
  test("28集、缺少 9,10、首次播放", async () => {
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
            if (args && args.select) {
              return [...Array(28)]
                .map((_, i) => {
                  const base = 0;
                  const order = base + i + 1;
                  if ([9, 10].includes(order)) {
                    return null;
                  }
                  return {
                    profile: {
                      order,
                    },
                  };
                })
                .filter(Boolean);
            }
            return [...Array(20)]
              .map((_, i) => {
                const base = 0;
                const order = base + i + 1;
                if ([9, 10].includes(order)) {
                  return null;
                }
                return {
                  id: String(order),
                  profile: {
                    name: `第${order}集`,
                    order,
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
        const order = i + 1;
        if ([9, 10].includes(order)) {
          return {
            id: "",
            name: "",
            overview: "",
            order,
            runtime: null,
            media_id: "",
            still_path: "",
            sources: [],
            subtitles: [],
          };
        }
        return {
          id: String(order),
          name: `第${order}集`,
          overview: undefined,
          order,
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
            if (args && args.select) {
              return [...Array(21)].map((_, i) => {
                return {
                  profile: {
                    order: i + 1,
                  },
                };
              });
            }
            return [...Array(20)]
              .map((_, i) => {
                const base = 0;
                const order = base + i + 1;
                // if ([24, 25].includes(order)) {
                //   return null;
                // }
                return {
                  id: String(order),
                  profile: {
                    name: `第${order}集`,
                    order,
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
      sources: [...Array(20)]
        .map((_, i) => {
          const order = i + 1;
          // if ([9, 10].includes(order)) {
          //   return null;
          // }
          return {
            id: String(order),
            name: `第${order}集`,
            overview: undefined,
            order,
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
        })
        .filter(Boolean),
      source_groups: [
        {
          start: 1,
          end: 21,
        },
      ],
    });
  });
});
describe("获取指定范围内的剧集", () => {
  test("共28集、缺 24,25、获取21-28", async () => {
    const count = 28;
    const start = 20;
    const end = 28;
    const remaining1 = end - start;
    const remaining2 = count - end;
    const missing_orders = [24, 25];
    const store: DataStore = {
      prisma: {
        media: {
          // @ts-ignore
          findFirst(args) {
            return {
              id: "media_id",
              profile: {
                name: "微暗之火",
                source_count: count,
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
                order: count,
              },
            };
          },
          // @ts-ignore
          findMany(args) {
            if (args && args.select) {
              return [...Array(count)].map((_, i) => {
                return {
                  profile: {
                    order: i + 1,
                  },
                };
              });
            }
            return [...Array(remaining1)]
              .map((_, i) => {
                const order = start + i + 1;
                if (missing_orders.includes(order)) {
                  return null;
                }
                return {
                  id: String(order),
                  profile: {
                    name: `第${order}集`,
                    order,
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
    const r2 = await media.fetch_episodes_by_range({ start, end });
    expect(r2.error).toBe(null);
    if (r2.error) {
      console.log(r2.error.message);
      return;
    }
    expect(r2.data).toStrictEqual(
      [...Array(remaining1)]
        .map((_, i) => {
          const order = start + i + 1;
          if (missing_orders.includes(order)) {
            return {
              id: "",
              name: "",
              overview: "",
              order,
              runtime: null,
              media_id: "",
              still_path: "",
              sources: [],
              subtitles: [],
            };
          }
          return {
            id: String(order),
            name: `第${order}集`,
            overview: undefined,
            order,
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
        })
        .filter(Boolean)
    );
  });
  test("共528集、缺 64,81,82至100、获取61-80", async () => {
    const count = 528;
    const start = 60;
    const end = 80;
    const remaining1 = end - start;
    const remaining2 = count - end;
    const missing_orders = [64, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100];
    const store: DataStore = {
      prisma: {
        media: {
          // @ts-ignore
          findFirst(args) {
            return {
              id: "media_id",
              profile: {
                name: "哆啦A梦",
                source_count: count,
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
                order: count,
              },
            };
          },
          // @ts-ignore
          findMany(args) {
            if (args && args.select) {
              return [...Array(end)].map((_, i) => {
                return {
                  profile: {
                    order: i + 1,
                  },
                };
              });
            }
            return [...Array(remaining1)]
              .map((_, i) => {
                const order = start + i + 1;
                if (missing_orders.includes(order)) {
                  return null;
                }
                return {
                  id: String(order),
                  profile: {
                    name: `第${order}集`,
                    order,
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
    const r2 = await media.fetch_episodes_by_range({ start, end });
    expect(r2.error).toBe(null);
    if (r2.error) {
      console.log(r2.error.message);
      return;
    }
    expect(r2.data).toStrictEqual(
      [...Array(remaining1)]
        .map((_, i) => {
          const order = start + i + 1;
          if (missing_orders.includes(order)) {
            return {
              id: "",
              name: "",
              overview: "",
              order,
              runtime: null,
              media_id: "",
              still_path: "",
              sources: [],
              subtitles: [],
            };
          }
          return {
            id: String(order),
            name: `第${order}集`,
            overview: undefined,
            order,
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
        })
        .filter(Boolean)
    );
  });
});
