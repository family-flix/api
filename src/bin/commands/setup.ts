/**
 * @file 初始化项目配置、文件命令
 */
import path from "path";

import { Result } from "@/types";
import { ensure } from "@/utils/fs";

import { check_database_initialized, run_command } from "../utils";
import { Application } from "../application";

async function setup_database(body: { app: Application }) {
  const { app } = body;
  const dir = app.database_dir;
  const filename = app.database_name;
  const initialized = await check_database_initialized(path.join(dir, filename));
  if (initialized) {
    const r0 = await run_command(
      `${app.database_client_path} migrate resolve --applied ${app.root_path}/prisma/migrations/20230611135946_init`
    );
    if (r0.error) {
      return Result.Err(r0.error);
    }
  }
  await ensure(dir);

  const r = await run_command(`${app.database_client_path} migrate deploy --schema ${app.schema_path}`);
  if (r.error) {
    return Result.Err(r.error);
  }
  return Result.Ok(null);
}

export async function setup(body: { app: Application }) {
  const r = await setup_database(body);
  if (r.error) {
    return Result.Err(r.error);
  }
  return Result.Ok(null);
}
