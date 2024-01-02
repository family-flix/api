import os from "os";
import path from "path";
import { exec } from "child_process";

import { Result } from "@/types";
import { ensure, check_existing } from "@/utils/fs";

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
  if (!existing.error) {
    return false;
  }
  return existing.data;
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
