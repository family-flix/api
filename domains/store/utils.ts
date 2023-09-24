import dayjs from "dayjs";
import { PrismaClient } from "@prisma/client";

import { FileType } from "@/constants";
import { List } from "@/domains/list";
import { Folder } from "@/domains/folder";
import { Result, resultify, Unpacked } from "@/types";
import { sleep } from "@/utils";

import { ModelKeys, ModelParam, ModelQuery } from "./types";
import { DatabaseStore } from ".";

const defaultRandomAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** 返回一条随机作为记录 id 的 15 位字符串 */
export function r_id() {
  return random_string(15);
}
/**
 * 返回一个指定长度的随机字符串
 * @param length
 * @returns
 */
export function random_string(length: number) {
  return random_string_with_alphabet(length, defaultRandomAlphabet);
}
function random_string_with_alphabet(length: number, alphabet: string) {
  let b = new Array(length);
  let max = alphabet.length;
  for (let i = 0; i < b.length; i++) {
    let n = Math.floor(Math.random() * max);
    b[i] = alphabet[n];
  }
  return b.join("");
}

export function add_factory<T extends PrismaClient[ModelKeys]>(model: T, options: Partial<{ safe: boolean }> = {}) {
  const { safe } = options;
  return async (
    data: Omit<Parameters<T["create"]>[0]["data"], "id"> & {
      // 仅测试环境可以传入 id 方便单测
      id?: string;
    }
  ) => {
    const { id, ...rest } = data;
    try {
      // @ts-ignore
      const created = (await model.create({
        data: {
          id: id || r_id(),
          ...rest,
        },
      })) as Unpacked<ReturnType<T["create"]>>;
      return Result.Ok(created);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  };
}
export function update_factory<T extends PrismaClient[ModelKeys]>(model: T) {
  return async (id: string, data: Parameters<T["update"]>[0]["data"]) => {
    try {
      // @ts-ignore
      const r = await model.update({
        where: {
          id,
        },
        data: {
          updated: dayjs().toISOString(),
          ...data,
        },
      });
      return Result.Ok(r);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  };
}
export function first_factory<T extends PrismaClient[ModelKeys]>(model: T) {
  return async (where: Parameters<T["update"]>[0]["data"] & { id?: string | null }) => {
    try {
      // @ts-ignore
      const r = (await model.findFirst({
        where,
      })) as Unpacked<ReturnType<T["findFirst"]>>;
      return Result.Ok(r);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  };
}
export function many_factory<T extends PrismaClient[ModelKeys]>(model: T) {
  return async (
    where: Parameters<T["update"]>[0]["data"] & { id?: string | null } = {},
    extra: Partial<{
      sorts: {
        key: string;
        order: "ASC" | "DESC";
      }[];
    }> = {}
  ) => {
    const { sorts = [] } = extra;
    let orderBy = {};
    if (sorts.length !== 0) {
      orderBy = sorts
        .map((s) => {
          const { key, order } = s;
          return {
            [key]: order === "ASC" ? "asc" : "desc",
          };
        })
        .reduce((total, cur) => {
          return { ...total, ...cur };
        }, {});
    }
    try {
      // @ts-ignore
      const r = (await model.findMany({
        where,
        orderBy,
      })) as Unpacked<ReturnType<T["findMany"]>>;
      return Result.Ok(r);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  };
}
export function delete_factory<T extends PrismaClient[ModelKeys]>(model: T) {
  return async (search: Parameters<T["update"]>[0]["data"] & { id?: string | null }) => {
    try {
      // @ts-ignore
      const existing = await model.findFirst({
        where: search,
      });
      if (existing === null) {
        return Result.Err("There is no matched record");
      }
      // @ts-ignore
      const r = await model.delete({
        where: {
          id: existing.id,
        },
      });
      return Result.Ok(r);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  };
}
export function pagination_factory<T extends PrismaClient[ModelKeys]>(model: T) {
  return async (
    params: Parameters<T["findMany"]>[0] & {
      id?: string;
    },
    extra: {
      page?: number;
      size?: number;
      page_size?: number;
      sorts?: {
        key: string;
        order: "DESC" | "ASC";
      }[];
    } = {}
  ) => {
    const { page = 1, page_size = 10, size = page_size, sorts = [] } = extra;
    const core = new List(model, {
      page: Number(page),
      page_size: Number(size),
      search: params.where || {},
      select: params.select,
      sorts,
    });
    const r = await core.fetch();
    return r;
  };
}

export async function walk_records<T extends PrismaClient[ModelKeys]>(
  model: T,
  where: NonNullable<Parameters<T["findMany"]>[number]>["where"],
  callback: (v: Unpacked<ReturnType<T["findMany"]>>[number]) => Promise<unknown>
) {
  const page_size = 20;
  let page = 1;
  let no_more = false;
  // @ts-ignore
  const count = await model.count({
    where,
  });
  do {
    // @ts-ignore
    const list = await model.findMany({
      where,
      skip: (page - 1) * page_size,
      take: page_size,
      orderBy: {
        name: "desc",
      },
    });
    no_more = list.length + (page - 1) * page_size >= count;
    page += 1;
    for (let i = 0; i < list.length; i += 1) {
      await sleep(1000);
      const item = list[i];
      await callback(item);
    }
  } while (no_more === false);
  return Result.Ok(null);
}

/**
 * 本地存储的 folder client，和 drive client 等同使用
 * @param body
 * @param store
 * @returns
 */
export function folder_client(body: { drive_id: string }, store: DatabaseStore) {
  const { drive_id } = body;
  return {
    async fetch_file(id: string) {
      const r = await store.find_file({ file_id: id, drive_id });
      if (r.error) {
        return r;
      }
      if (!r.data) {
        return Result.Err("No matched record");
      }
      return Result.Ok({
        ...r.data,
        type: r.data.type === 1 ? "file" : "folder",
      });
    },
    async fetch_files(id: string, options: { marker?: string } = {}) {
      const { marker } = options;
      const page_size = 20;
      const r = await resultify(store.prisma.file.findMany.bind(store.prisma.file))({
        where: {
          parent_file_id: id,
          drive_id: drive_id,
          name: marker === "" ? undefined : { lte: marker },
        },
        orderBy: {
          name: "desc",
        },
        take: page_size + 1,
      });
      if (r.error) {
        return r;
      }
      const rows = r.data.map((f) => {
        const { file_id, parent_file_id, name, type } = f;
        return {
          file_id,
          parent_file_id,
          name,
          type: type === FileType.File ? "file" : "folder",
        };
      });
      const has_next_page = rows.length === page_size + 1 && rows[page_size];
      const next_marker = has_next_page ? rows[page_size].name : "";
      const result = {
        items: rows.slice(0, page_size),
        next_marker,
      };
      return Result.Ok(result);
    },
  } as Folder["client"];
}

// walk_model_with_cursor(async (handler) => {
//   const parsed_episode_list = await store.prisma.parsed_episode.findMany({
//     where,
//     include: {
//       parsed_tv: true,
//       parsed_season: true,
//     },
//     take: PAGE_SIZE,
//     skip: (() => {
//       if (next_marker) {
//         return 1;
//       }
//       return 0;
//     })(),
//     orderBy: [
//       {
//         parsed_tv: {
//           name: "desc",
//         },
//       },
//     ],
//   });
// });

export async function walk_model_with_cursor<F extends (extra: { take: number }) => any>(
  fn: F,
  options: { page_size: number; handler: (data: Unpacked<ReturnType<F>>[number], index: number) => any }
) {
  const { page_size, handler } = options;
  let next_marker = "";
  let no_more = false;
  // const count = await store.prisma.file.count({ where });
  do {
    const extra_args = {
      take: page_size + 1,
      ...(() => {
        const cursor: { id?: string } = {};
        if (next_marker) {
          cursor.id = next_marker;
          return {
            cursor,
          };
        }
        return {};
      })(),
    };
    const list = await fn(extra_args);
    no_more = list.length < page_size + 1;
    next_marker = "";
    if (list.length === page_size + 1) {
      const last_record = list[list.length - 1];
      next_marker = last_record.id;
    }
    const correct_list = list.slice(0, page_size);
    for (let i = 0; i < correct_list.length; i += 1) {
      const data = correct_list[i];
      await handler(data, i);
    }
  } while (no_more === false);
}
