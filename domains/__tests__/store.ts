/**
 * @file 测试用例单例
 */
import path from "path";

import { Application } from "@/domains/application";

export const app = new Application({
  root_path: path.join(__dirname, "output"),
});
export const test_store = app.store;
