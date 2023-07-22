/**
 * @file 封装的一些文件操作相关的函数
 */
import fs from "fs/promises";
import path from "path";

import { accessSync, mkdirSync } from "fs";

/**
 * 确保某个路径必然存在
 * @param filepath
 */
export async function ensure(filepath: string, next: string[] = []) {
  const { ext, dir } = path.parse(filepath);
  const isFile = ext !== undefined && ext !== "";
  if (isFile) {
    filepath = dir;
  }
  try {
    await fs.access(filepath);
    if (next.length !== 0) {
      const theDirPrepareCreate = next.pop();
      await fs.mkdir(theDirPrepareCreate!);
      await ensure(filepath, next);
    }
  } catch {
    const needToCreate = path.dirname(filepath);
    await ensure(needToCreate, next.concat(filepath));
  }
}

export function ensure_sync(filepath: string, next: string[] = []) {
  const { ext, dir } = path.parse(filepath);
  const isFile = ext !== undefined && ext !== "";
  if (isFile) {
    filepath = dir;
  }
  try {
    accessSync(filepath);
    if (next.length !== 0) {
      const theDirPrepareCreate = next.pop();
      mkdirSync(theDirPrepareCreate!);
      ensure_sync(filepath, next);
    }
  } catch {
    const needToCreate = path.dirname(filepath);
    ensure_sync(needToCreate, next.concat(filepath));
  }
}
