/*u
 * @file 封装的一些文件操作相关的函数
 */
import { accessSync, createReadStream, createWriteStream, mkdirSync } from "fs";
import fs from "fs/promises";
import path from "path";

import { Result } from "@/types";

/**
 * 确保某个路径必然存在
 * @param filepath
 */
export async function ensure(filepath: string, next: string[] = []) {
  const { ext, dir } = path.parse(filepath);
  const is_file = ext !== undefined && ext !== "";
  if (is_file) {
    filepath = dir;
  }
  try {
    await fs.access(filepath);
    if (next.length !== 0) {
      const the_dir_prepare_create = next.pop();
      await fs.mkdir(the_dir_prepare_create!);
      await ensure(filepath, next);
    }
  } catch {
    const need_to_create = path.dirname(filepath);
    await ensure(need_to_create, next.concat(filepath));
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

export async function file_info(file_path: string) {
  try {
    const stats = await fs.stat(file_path);
    return Result.Ok({
      size: stats.size,
      file_type: (() => {
        if (stats.isDirectory()) {
          return "directory";
        }
        if (stats.isFile()) {
          return "file";
        }
        return "unknown";
      })(),
    });
  } catch (err) {
    const e = err as Error;
    return Result.Err(e.message);
  }
}

export async function check_path_type(file_path: string): Promise<Result<"directory" | "file">> {
  try {
    const stats = await fs.stat(file_path);
    if (stats.isDirectory()) {
      return Result.Ok("directory");
    }
    if (stats.isFile()) {
      return Result.Ok("file");
    }
    return Result.Err("unknown");
  } catch (err) {
    const e = err as Error;
    return Result.Err(e.message);
  }
}
export async function copy(src: string, dest: string): Promise<Result<string>> {
  return new Promise((resolve) => {
    const read_stream = createReadStream(src);
    const write_stream = createWriteStream(dest);

    read_stream.on("error", (err) => {
      resolve(Result.Err(err.message));
    });
    write_stream.on("error", (err) => {
      resolve(Result.Err(err.message));
    });
    write_stream.on("close", () => {
      resolve(Result.Ok(dest));
    });
    read_stream.pipe(write_stream);
  });
}

export async function check_existing(filepath: string) {
  try {
    await fs.stat(filepath);
    return Result.Ok(true);
  } catch (err) {
    return Result.Ok(false);
  }
}
export async function access(filepath: string): Promise<Result<null>> {
  try {
    await fs.access(filepath);
    return Result.Ok(null);
  } catch (err) {
    const e = err as Error;
    return Result.Err(e.message);
  }
}
export async function mkdir(filepath: string): Promise<Result<null>> {
  try {
    await fs.mkdir(filepath);
    return Result.Ok(null);
  } catch (err) {
    const e = err as Error;
    return Result.Err(e.message);
  }
}
