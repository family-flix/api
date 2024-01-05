import path from "path";

import { PrismaClient } from "@prisma/client";

import { DatabaseStore } from "@/domains/store";
import { ensure } from "@/utils/fs";

let cached: null | DatabaseStore = null;

export class Application {
  root_path: string;
  database_path: string;
  database_dir: string;
  database_name: string;
  assets: string;
  env: Record<string, string> = {};
  timer: null | NodeJS.Timer = null;
  listeners: {
    handler: Function;
    delay: number;
    elapsed: number;
  }[] = [];

  store: DatabaseStore;

  constructor(options: { root_path: string; env?: Record<string, string> }) {
    const { root_path, env = {} } = options;
    this.root_path = root_path;
    this.env = env;

    const database_dir = path.join(root_path, "data");
    const database_name = "family-flix.db?connection_limit=1";
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
    ensure(path.join(this.assets, "subtitle"));
    ensure(path.join(root_path, "logs"));
    (() => {
      if (cached) {
        this.store = cached;
        return;
      }
      console.log("__new prisma client");
      this.store = new DatabaseStore(
        new PrismaClient({
          datasources: {
            db: {
              url: `file://${this.database_path}`,
            },
          },
        })
      );
      cached = this.store;
    })();
  }

  startInterval<T extends Function>(handler: T, delay: number) {
    (() => {
      if (this.timer !== null) {
        return;
      }
      this.timer = setInterval(() => {
        // console.log("[DOMAIN]Application - tick");
        this.listeners.forEach((event) => {
          event.elapsed += 1000;
          if (event.elapsed >= event.delay) {
            event.handler();
            event.elapsed = 0;
          }
        });
      }, 1000 * 1);
    })();
    // console.log("[DOMAIN]Application - startInterval", delay);
    const handlers = this.listeners.map((l) => l.handler);
    if (handlers.includes(handler)) {
      return;
    }
    this.listeners.push({
      handler,
      delay,
      elapsed: 0,
    });
  }
  clearInterval<T extends Function>(handler: T) {
    const handlers = this.listeners.map((l) => l.handler);
    if (!handlers.includes(handler)) {
      return;
    }
    this.listeners = this.listeners.filter((l) => {
      return l.handler !== handler;
    });
    if (this.listeners.length === 0) {
      if (this.timer !== null) {
        clearInterval(this.timer);
      }
    }
  }
}
