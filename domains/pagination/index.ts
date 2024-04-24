/**
 * @file 支持从数据库按分页获取列表
 * @doc https://www.prisma.io/docs/concepts/components/prisma-client/pagination
 */
import { PrismaClient } from "@prisma/client";

import { Result, Unpacked } from "@/types";

type ModelKeys = keyof Omit<PrismaClient, "$on" | "$connect" | "$disconnect" | "$use" | "$executeRaw" | "$executeRawUnsafe" | "$queryRaw" | "$queryRawUnsafe" | "$transaction">;

export function paginationFactory<T>(params: PaginationParams): [any, (list: T[], total: number) => any] {
  return [paginationParams<T>(params), result<T>(params)];
}

type PaginationParams = {
  page: number;
  page_size: number;
  search: Record<string, unknown>;
  select?: Record<string, unknown> | null;
  start?: unknown;
  skip?: number;
  sorts?: {
    key: string;
    order: "ASC" | "DESC";
  }[];
};
export function paginationParams<T>(params: PaginationParams) {
  const { page = 1, page_size = 10, sorts = [], select, start, skip = 0, search } = params;
  const result: {
    where: Record<string, unknown>;
    select?: Record<string, unknown> | null;
    skip: number;
    take: number;
    orderBy?: Record<string, "desc" | "asc">[];
    cursor?: { id: number };
  } = {
    where: search,
    skip: (page - 1) * page_size + Number(skip),
    take: Number(page_size),
  };
  if (select) {
    result.select = select;
  }
  if (sorts.length !== 0) {
    result.orderBy = sorts.map((s) => {
      const { key, order } = s;
      return {
        [key]: order === "ASC" ? "asc" : "desc",
      };
    });
  }
  const s = Number(start);
  if (!Number.isNaN(s)) {
    result.skip = 1;
    result.cursor = {
      id: s,
    };
  }
  return result;
}

function result<T>(params: PaginationParams) {
  return (list: T[], total: number) => {
    const { page = 1, page_size = 10 } = params;
    const data = {
      page: Number(page),
      page_size: Number(page_size),
      total,
      no_more: list.length < page_size,
      list,
    };
    return data;
  };
}

export class List<T extends PrismaClient[ModelKeys]> {
  model: T;
  params: PaginationParams;
  constructor(model: T, params: PaginationParams) {
    this.model = model;
    this.params = params;
  }

  async fetch() {
    const [findManyParams, getResult] = paginationFactory(this.params);
    // @ts-ignore
    const total = await this.model.count({
      where: findManyParams.where,
    });
    // @ts-ignore
    const list = await this.model.findMany({
      ...findManyParams,
    });
    const response = getResult(list, total) as {
      list: Unpacked<ReturnType<T["findMany"]>>[0][];
      total: number;
      page: number;
      page_size: number;
      no_more: boolean;
    };
    return Result.Ok(response);
  }
}
