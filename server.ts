import { createServer } from "http";
import { parse } from "url";
import os from "os";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

import next from "next";
import { PrismaClient } from ".prisma/client";

import { Result } from "./types";

function get_ip_address() {
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
  return null;
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

function run_command(command: string) {
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
async function check_database_initialized(filepath: string) {
  const existing = await check_existing(filepath);
  if (!existing) {
    return false;
  }
  return true;
}
async function setup_database(body: { dir: string; filename: string }) {
  const { dir, filename } = body;
  const initialized = await check_database_initialized(path.join(dir, filename));
  if (initialized) {
    return Result.Ok(null);
  }
  await ensure(dir);
  await run_command("npx prisma db push");
  return Result.Ok(null);
}

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const DATABASE_PATH = path.join(__dirname, "data");
const DATABASE_FILENAME = "family-flix.db";
const STORAGE_PATH = path.join(__dirname, "storage");

async function main() {
  await setup_database({ dir: DATABASE_PATH, filename: DATABASE_FILENAME });

  const host = get_ip_address();
  const port = 3100;

  app.prepare().then(() => {
    createServer((req, res) => {
      const parsed_url = parse(req.url!, true);
      const { pathname } = parsed_url;

      if (pathname!.startsWith("/storage/")) {
        const imagePath = path.join(__dirname, pathname!);
        app.serveStatic(req, res, imagePath);
        return;
      }
      handle(req, res, parsed_url);
    }).listen(port, () => {
      (async () => {
        try {
          const store = new PrismaClient({
            //   datasources: {
            //     db: {
            //       url: "",
            //     },
            //   },
          });
          const admin = await store.user.findFirst({
            include: {
              settings: true,
            },
          });
        } catch (err) {
          const msg = (err as Error).message;
          // if (msg.includes("Environment variable not found")) {
          //   console.log("need setup");
          //   return;
          // }
        }
      })();
      console.log(`> Ready on http://${host}:${port}/admin/`);
    });
  });
}

main();
