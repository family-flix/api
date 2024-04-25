/**
 * @file 全局单例
 */
import { config } from "dotenv";

import { Application } from "@/domains/application/index";
import { parse_argv } from "@/utils/server";

config();
let initialized: null | Application<{
  root_path: string;
  env: {};
  args: {
    port: number;
  };
}> = null;

export const app = (() => {
  if (initialized) {
    return initialized;
  }
  const r = new Application({
    root_path: process.env.OUTPUT_PATH || process.cwd(),
    env: process.env as Record<string, string>,
    args: parse_argv<{ port: number }>(process.argv.slice(2)),
  });
  initialized = r;
  return r;
})();
export const store = app.store;
// export const notify = app.notify;

export type BaseApiResp<T> = {
  code: number;
  msg: string;
  data: T;
};

export type ListResponse<T> = {
  total: number;
  page: number;
  page_size: number;
  list: T[];
};
