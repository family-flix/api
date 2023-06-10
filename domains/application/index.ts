import path from "path";
import fs from "fs/promises";

import { PrismaClient } from "@prisma/client";

import { DatabaseStore } from "@/domains/store";

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

export class Application {
  root_path: string;
  database_path: string;
  database_dir: string;
  database_name: string;
  assets: string;

  store: DatabaseStore;

  constructor(options: { root_path: string }) {
    const { root_path } = options;
    this.root_path = root_path;
    const database_dir = path.join(root_path, "data");
    const database_name = "family-flix.db";
    const storage_path = path.join(root_path, "storage");
    this.database_path = path.join(database_dir, database_name);
    this.database_dir = database_dir;
    this.database_name = database_name;
    this.assets = storage_path;
    // ensure(this.DATABASE_PATH);
    ensure(this.assets);
    ensure(path.join(this.assets, "default"));
    ensure(path.join(this.assets, "poster"));
    ensure(path.join(this.assets, "thumbnail"));
    ensure(path.join(this.assets, "backdrop"));

    this.store = new DatabaseStore(
      new PrismaClient({
        datasources: {
          db: {
            url: `file://${this.database_path}`,
          },
        },
      })
    );
  }
}
