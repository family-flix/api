import sqlite from "sqlite3";

import { FetchParams } from "@list-helper/core/typing";
import { log } from "@/logger/log";
import { Result } from "@/types";
import { random_string } from "@/utils";

export class StoreOperation {
  db: sqlite.Database;

  constructor(db_path?: string) {
    if (!db_path) {
      throw new Error("Missing data_path");
    }
    const sqlite3 = sqlite.verbose();
    const db = new sqlite3.Database(db_path);
    this.db = db;
  }

  run = <T>(sql: string): Promise<Result<T>> => {
    return new Promise((resolve) => {
      this.db.run(sql, (err: Error, row: T) => {
        if (err) {
          const e = err as Error;
          return resolve(Result.Err(e));
        }
        return resolve(Result.Ok(row));
      });
    });
  };

  get = <T>(sql: string): Promise<Result<T>> => {
    return new Promise((resolve) => {
      this.db.get(sql, (err: Error, row: T) => {
        if (err) {
          const e = err as Error;
          return resolve(Result.Err(e));
        }
        return resolve(Result.Ok(row));
      });
    });
  };

  all = <T>(sql: string): Promise<Result<T>> => {
    return new Promise((resolve) => {
      this.db.all(sql, (err: Error, rows: T) => {
        if (err) {
          const e = err as Error;
          return resolve(Result.Err(e));
        }
        return resolve(Result.Ok(rows));
      });
    });
  };

  /** 清空指定表 */
  clear_dataset = (name: string) => {
    return this.run(`DELETE FROM ${name};`);
  };
  clear_tables = (names: string[]) => {
    this.db.serialize(() => {
      for (let i = 0; i < names.length; i += 1) {
        const name = names[i];
        this.run(`DELETE FROM ${name};`);
      }
    });
  };
}

/**
 * 新增记录工厂方法
 * @param body
 * @returns
 */
export function add_record_factory<T, U extends any>(
  table_name: string,
  db: StoreOperation
) {
  return async (body: T) => {
    const id = random_string(15);
    const now = new Date().toISOString();
    const body_str = build_adding_body({
      id,
      // 这里特意将 body 放在 id 下面是为了在单测中，可以外部给 id 方便写单测，在实际使用中 body 不要传 id!!!
      ...body,
      created: now,
      updated: now,
    });
    const sql = `INSERT INTO ${table_name} ${body_str};`;
    log(`add ${table_name} ->`, sql);
    const r = await db.run(sql);
    if (r.error) {
      return r;
    }
    const result = {
      id,
      ...body,
    } as U;
    return Result.Ok(result);
  };
}

/**
 * 删除记录工厂方法
 * @param body
 * @returns
 */
export function delete_record_factory<T, U extends any>(
  table_name: string,
  store: StoreOperation
) {
  return async (body: T) => {
    // @ts-ignore
    const fields = build_key_values(body);
    const sql = `DELETE FROM ${table_name} WHERE ${fields.join(" AND ")};`;
    log(`delete ${table_name} ->`, sql);
    const r = await store.run<void>(sql);
    if (r.error) {
      return r;
    }
    const result = {} as U;
    return Result.Ok(result);
  };
}

/**
 * @param body
 * @returns
 */
export function update_record_factory<
  T extends Record<string, string | number | boolean>,
  U
>(table_name: string, store: StoreOperation) {
  return async (id: string, body: T) => {
    if (!id) {
      return Result.Err("请传入 id");
    }
    const now = new Date().toISOString();
    const fields = build_key_values({ ...body, updated: now });
    if (fields.length === 0) {
      return Result.Err("Update body is empty");
    }
    const sql = `UPDATE ${table_name} SET ${fields.join(
      ", "
    )} WHERE id = '${id}';`;
    log(`update ${table_name} ->`, sql);
    const r = await store.run(sql);
    if (r.error) {
      return r;
    }
    const result = {
      id,
      ...body,
    } as U;
    return Result.Ok(result);
  };
}

/** 查找单条记录工厂方法 */
export function find_record_factory<
  T extends Record<string, string | number | boolean>,
  U extends Record<string, string | number | boolean>
>(table_name: string, store: StoreOperation) {
  return async (body: T, operation = "AND") => {
    const fields = build_key_values(body);
    let sql = `SELECT * from ${table_name} `;
    if (fields.length !== 0) {
      const condition = fields.join(` ${operation} `);
      sql += `WHERE ${condition}`;
    }
    sql += ";";
    log(`find record from ${table_name} ->`, sql);
    const r = await store.get<
      | ({
          id: string;
          created: string;
          updated: string;
        } & U)
      | null
    >(sql);
    return r;
  };
}

/** 查找多条记录工厂方法 */
export function find_records_factory<T, U>(
  table_name: string,
  store: StoreOperation
) {
  return (
    body?: T,
    options: Partial<{
      condition: "OR" | "AND";
      sorts: { key: string; order: "ASC" | "DESC" }[];
    }> = {}
  ) => {
    const { condition = "AND", sorts = [] } = options;
    // @ts-ignore
    const fields = build_key_values<T>(body);
    let sql = `SELECT * from ${table_name}`;
    if (fields.length !== 0) {
      const condition_str = fields.join(` ${condition} `);
      sql += ` WHERE ${condition_str}`;
    }
    const sort_str = build_sort_condition(sorts);
    if (sort_str) {
      sql += ` ${sort_str}`;
    }
    sql += ";";
    log(`find records from ${table_name} ->`, sql);
    return store.all<U[]>(sql);
  };
}

/**
 * 指定表分页
 */
export function record_pagination_factory<T, U>(
  table_name: string,
  store: StoreOperation
) {
  return async (
    body: T & Partial<FetchParams>,
    pagination: Partial<{
      page: number;
      size: number;
      sorts: { key: string; order: "ASC" | "DESC" }[];
    }> = {}
  ) => {
    const { page = 1, size = 20, sorts } = pagination;
    const number_page = Number(page);
    const number_size = Number(size);
    const fields = build_key_values(body);
    const count = await (async () => {
      let sql2 = `SELECT COUNT(*) count FROM ${table_name}`;
      if (fields.length !== 0) {
        sql2 += ` WHERE ${fields.join(" AND ")}`;
      }
      const r1 = await store.get<{ count: number }>(sql2);
      if (r1.error) {
        return r1;
      }
      return r1.data.count;
    })();
    let sql = `SELECT * FROM ${table_name}`;
    if (fields.length !== 0) {
      sql += ` WHERE ${fields.join(" AND ")}`;
    }
    const sort_str = build_sort_condition(sorts);
    if (sort_str) {
      sql += `${sort_str}`;
    }
    sql += ` LIMIT ${(number_page - 1) * number_size}, ${number_size}`;
    sql += ";";
    log(`find with pagination from ${table_name} ->`, sql);
    const list_resp = await store.all<U[]>(sql);
    if (list_resp.error) {
      return list_resp;
    }
    return Result.Ok({
      total: count,
      no_more: (() => {
        if (number_page * number_size >= count) {
          return true;
        }
        return false;
      })(),
      list: list_resp.data,
    });
  };
}

export function records_pagination_using_sql<
  T = unknown,
  U = Record<string, unknown>
>(sql: string, count_sql: string, operation: StoreOperation) {
  return async (body: {
    page: number;
    page_size: number;
    sorts?: { key: string; order: "ASC" | "DESC" }[];
  }) => {
    const { page = 1, page_size = 20, sorts = [] } = body;
    const limit = ` LIMIT ${(page - 1) * page_size}, ${page_size}`;
    const count_resp = await (async () => {
      const s = `${count_sql};`;
      log("get count of records with directly sql ->", s);
      const r1 = await operation.get<{ count: number }>(s);
      if (r1.error) {
        return r1;
      }
      return Result.Ok(r1.data.count);
    })();
    if (count_resp.error) {
      return count_resp;
    }
    const sort_str = build_sort_condition(sorts);
    if (sort_str) {
      sql += ` ${sort_str}`;
    }
    const s = `${sql}${limit};`;
    log("get records with directly sql ->", s);
    const resp = await operation.all<U[]>(s);
    if (resp.error) {
      return resp;
    }
    const data = {
      total: count_resp.data,
      no_more: (() => {
        if (page * page_size >= count_resp.data) {
          return true;
        }
        return false;
      })(),
      list: resp.data,
    };
    return Result.Ok(data);
  };
}
export function process_db_value(v?: string | number | boolean | null) {
  if (v === undefined) {
    return `= ''`;
  }
  if (v === null) {
    return `= ''`;
  }
  if (v === "null") {
    return `= ''`;
  }
  if (v === "not null") {
    return `!= ''`;
  }
  if (typeof v === "string" && v.match(/%[^%]{1,}%/)) {
    return `LIKE '${v}'`;
  }
  if (typeof v === "string" && v.includes('"')) {
    return `= '${v}'`;
  }
  return `= "${v}"`;
}
function build_key_values<
  T extends Record<string, string | number | boolean | null> = {}
>(body?: T) {
  if (!body) {
    return [];
  }
  return Object.keys(body)
    .filter((k) => {
      return body[k] !== undefined && body[k] !== "";
    })
    .map((k) => {
      const v = body[k];
      return `${k} ${process_db_value(v)}`;
    });
}
function build_adding_body(body: Record<string, string>) {
  const keys = Object.keys(body)
    .filter((k) => {
      return body[k] !== undefined && body[k] !== "";
    })
    .map((k) => {
      const v = body[k];
      return [k, v];
    })
    .reduce(
      (total, cur) => {
        const clone = [...total];
        clone[0].push(cur[0]);
        clone[1].push(cur[1]);
        return clone as [string[], string[]];
      },
      [[], []] as [string[], string[]]
    );
  const keys_str = `${keys[0].join(", ")}`;
  const value_str = keys[1]
    .map((v) => {
      if (v === "null") {
        return `''`;
      }
      if (typeof v === "string" && v.includes('"')) {
        return `'${v}'`;
      }
      return `"${v}"`;
    })
    .join(", ");
  return `(${keys_str}) VALUES (${value_str})`;
}

export function build_sort_condition(
  sort: {
    key: string;
    order: "ASC" | "DESC";
  }[] = []
) {
  const sort_str = (() => {
    const str = sort
      .map((s) => {
        const { key, order } = s;
        return `${key} ${order}`;
      })
      .join(", ");
    if (str) {
      return ` ORDER BY ${str}`;
    }
    return "";
  })();
  return sort_str;
}
