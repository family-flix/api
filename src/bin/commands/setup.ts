/**
 * @file 初始化项目配置、文件命令
 */
import path from "path";
import fs from "fs";

import { Result } from "@/types";

import { check_database_initialized, ensure } from "../utils";

async function setup_database(body: { dir: string; filename: string; public_path: string }) {
  const { dir, filename, public_path } = body;
  const initialized = await check_database_initialized(path.join(dir, filename));
  if (initialized) {
    return Result.Ok(null);
  }
  await ensure(dir);
  fs.copyFileSync(path.join(public_path, filename), path.join(dir, filename));
  return Result.Ok(null);
}

export async function setup(body: { dir: string; filename: string; public_path: string }) {
  const r = await setup_database(body);
  if (r.error) {
    return Result.Err(r.error);
  }
  return Result.Ok(null);
}
