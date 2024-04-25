/**
 * @file 全局单例
 */
import { config } from "dotenv";

import { Application } from "@/domains/application/index";
import { parse_argv } from "@/utils/server";
import { ApplicationState } from "./types";

config();
let initialized: null | Application<ApplicationState> = null;

export const app = (() => {
  if (initialized) {
    return initialized;
  }
  const r = new Application<ApplicationState>({
    root_path: process.env.OUTPUT_PATH || process.cwd(),
    env: process.env as any,
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
