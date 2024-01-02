/**
 * @file 全局单例
 */
import { Application } from "@/domains/application";

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
