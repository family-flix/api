/**
 * @file 全局单例
 */
import { Application } from "@/domains/application";

export const app = new Application({
  root_path: process.env.OUTPUT_PATH || process.cwd(),
});
export const store = app.store;
