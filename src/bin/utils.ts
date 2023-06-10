import os from "os";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

import { Result } from "@/types";

export function get_ip_address() {
  const interfaces = os.networkInterfaces();
  for (const interface_name in interfaces) {
    const networkInterface = interfaces[interface_name];
    if (networkInterface) {
      for (const network of networkInterface) {
        // 过滤掉 IPv6 地址和回环地址
        if (network.family === "IPv4" && !network.internal) {
          return network.address;
        }
      }
    }
  }
  return "0.0.0.0";
}

function check_existing(pathname: string) {
  return new Promise((resolve, reject) => {
    fs.stat(pathname, (err, stats) => {
      if (err) {
        const e = err as Error;
        return resolve(false);
      }
      return resolve(true);
    });
  });
}
function access(filepath: string): Promise<Result<null>> {
  return new Promise((resolve) => {
    fs.access(filepath, (err) => {
      if (err) {
        const e = err as Error;
        return resolve(Result.Err(e.message));
      }
      return resolve(Result.Ok(null));
    });
  });
}
function mkdir(filepath: string): Promise<Result<null>> {
  return new Promise((resolve) => {
    fs.mkdir(filepath, (err) => {
      if (err) {
        const e = err as Error;
        return resolve(Result.Err(e.message));
      }
      return resolve(Result.Ok(null));
    });
  });
}
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
  const r = await access(filepath);
  if (r.error) {
    const need_to_create = path.dirname(filepath);
    await ensure(need_to_create, next.concat(filepath));
    return;
  }
  const the_dir_prepare_create = next.pop();
  if (the_dir_prepare_create) {
    await mkdir(the_dir_prepare_create);
    await ensure(filepath, next);
  }
}

export function run_command(command: string): Promise<Result<null>> {
  return new Promise((resolve) => {
    const cp = exec(command);
    // cp.stdout?.on("data", (data) => {
    //   console.log(data.toString());
    // });
    // cp.stderr?.on("data", (data) => {
    //   console.error(data.toString());
    // });
    cp.on("close", (code) => {
      if (code === 0) {
        return resolve(Result.Ok(null));
      }
      return resolve(Result.Err(`Prisma command failed with exit code ${code}`));
    });
  });
}

/** 检查数据库是否初始化 */
export async function check_database_initialized(filepath: string) {
  const existing = await check_existing(filepath);
  if (!existing) {
    return false;
  }
  return true;
}

export async function setup_database(body: { dir: string; filename: string }) {
  const { dir, filename } = body;
  const initialized = await check_database_initialized(path.join(dir, filename));
  if (initialized) {
    return Result.Ok(null);
  }
  await ensure(dir);
  await run_command("npx prisma db push");
  return Result.Ok(null);
}

/**
 * 是否已经初始化完成（有配置文件、数据库文件）
 */
export async function has_setup(body: { database_path: string }) {
  const { database_path } = body;
  const existing = await check_existing(database_path);
  if (!existing) {
    return false;
  }
  return true;
}
