/**
 * @file 全局单例
 */
import { Application } from "@/domains/application";

export const app = new Application({
  root_path: process.env.OUTPUT_PATH || process.cwd(),
  env: process.env as Record<string, string>,
});
export const store = app.store;
// export const notify = app.notify;
