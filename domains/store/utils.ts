import dayjs from "dayjs";
import { PrismaClient } from "@prisma/client";

import { List } from "@/domains/list";
import { Result, Unpacked } from "@/types";

import { ModelKeys } from "./types";
/**
 * 延迟指定时间
 * @param delay 要延迟的时间，单位毫秒
 * @returns
 */
export function sleep(delay: number = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, delay);
  });
}

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
