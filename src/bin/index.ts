import { brand } from "@/utils/text";
import { parse_argv } from "@/utils/server";

import { start } from "./commands/start";
import { setup } from "./commands/setup";
import { Application } from "./application";

async function main() {
  const app = new Application({ root_path: process.env.OUTPUT_PATH || process.cwd() });
  const args = parse_argv(process.argv);
  process.env.DATABASE_PATH = `file://${app.database_path}`;
  const r = await setup({ app });
  if (r.error) {
    console.log("初始化失败", r.error.message);
    return;
  }
  const DEFAULT_PORT = 3100;
  const { port = DEFAULT_PORT } = args;
  const res = await start({
    dev: process.env.NODE_ENV !== "production",
    port: (() => {
      if (typeof port === "boolean") {
        return DEFAULT_PORT;
      }
      if (typeof port === "string") {
        const n = Number(port);
        return Number.isNaN(n) ? DEFAULT_PORT : n;
      }
      return port;
    })(),
    pathname: "/admin",
    assets: app.assets,
  });
  if (res.error) {
    console.log(res.error.message);
    return;
  }
  const { host, pathname } = res.data;
  brand();
  console.log();
  console.log("应用信息");
  console.log("静态资源目录", app.assets);
  console.log("数据库文件 ", app.database_path);
  console.log(`> Ready on http://${host}:${port}${pathname}`);
}

main();
