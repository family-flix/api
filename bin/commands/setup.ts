/**
 * @file 初始化项目配置、文件命令
 */
import { createServer } from "http";
import { parse } from "url";
import os from "os";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

import next from "next";
import { PrismaClient } from ".prisma/client";

import { Result } from "@/types";

import { check_database_initialized, ensure, run_command } from "../utils";

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

const DATABASE_PATH = path.join(__dirname, "data");
const DATABASE_FILENAME = "family-flix.db";
const STORAGE_PATH = path.join(__dirname, "storage");

export async function setup() {
  await setup_database({ dir: DATABASE_PATH, filename: DATABASE_FILENAME });
}
