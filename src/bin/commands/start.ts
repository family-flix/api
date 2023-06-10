import next from "next";
import express from "express";

import { Result } from "@/types";

import { get_ip_address } from "../utils";

const app = next({
  dev: false,
  dir: __dirname,
  conf: {
    async rewrites() {
      return [
        {
          source: "/admin/:path*",
          destination: "/admin/index.html",
        },
        {
          source: "/mobile/:path*",
          destination: "/mobile/index.html",
        },
      ];
    },
  },
});
const handle = app.getRequestHandler();

export async function start(options: { port: number; pathname: string; assets: string }): Promise<
  Result<{
    host: string;
    port: number;
    pathname: string;
  }>
> {
  const { pathname, assets, port = 3000 } = options;
  //   const { pathname } = options;
  //   await setup_database({ dir: DATABASE_PATH, filename: DATABASE_FILENAME });
  //   await check_database_initialized();

  const host = get_ip_address();
  // const host = "0.0.0.0";

  return new Promise((resolve) => {
    app.prepare().then(
      () => {
        const server = express();
        server.use(express.static(assets));
        server.all("*", (req, res) => {
          return handle(req, res);
        });
        server.listen(port, host, () => {
          resolve(
            Result.Ok({
              host,
              port,
              pathname,
            })
          );
        });
      },
      (error) => {
        resolve(Result.Err(error.message));
        // console.log("Server started failed", error.message);
      }
    );
  });
}