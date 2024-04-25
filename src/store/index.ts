/**
 * @file 全局单例
 */
import { config } from "dotenv";

import { Application } from "@/domains/application";

config();
let initialized: null | Application = null;

export const app = (() => {
  if (initialized) {
    return initialized;
  }
  const r = new Application({
    root_path: process.env.OUTPUT_PATH || process.cwd(),
    env: process.env as Record<string, string>,
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
