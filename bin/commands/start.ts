/**
 * @file 启动项目命令
 */
import { createServer } from "http";
import { parse } from "url";
import path from "path";

import next from "next";

import { check_database_initialized, get_ip_address, setup_database } from "../utils";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

export async function start() {
  //   await setup_database({ dir: DATABASE_PATH, filename: DATABASE_FILENAME });
  //   await check_database_initialized();

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
      console.log(`> Ready on http://${host}:${port}/admin/`);
    });
  });
}
