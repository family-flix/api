import path from "path";

import { ensure } from "@/utils/fs";

export class Application {
  root_path: string;
  schema_path: string;
  database_client_path: string;
  database_path: string;
  database_dir: string;
  database_name: string;
  assets: string;

  constructor(options: { root_path: string }) {
    const { root_path } = options;
    this.root_path = root_path;
    const database_dir = path.join(root_path, "data");
    const database_name = "family-flix.db";
    const database_client_name = "prisma_v4.17.0";
    const storage_path = path.join(root_path, "storage");
    this.schema_path = path.join(root_path, "prisma/schema.prisma");
    this.database_path = path.join(database_dir, database_name);
    this.database_client_path = path.join(root_path, database_client_name);
    this.database_dir = database_dir;
    this.database_name = database_name;
    this.assets = storage_path;
    // ensure(this.DATABASE_PATH);
    ensure(this.assets);
    ensure(path.join(this.assets, "default"));
    ensure(path.join(this.assets, "poster"));
    ensure(path.join(this.assets, "thumbnail"));
    ensure(path.join(this.assets, "backdrop"));
  }
}
