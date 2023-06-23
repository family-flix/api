import path from "path";
import fs from "fs/promises";

import { start } from "./commands/start";
import { setup } from "./commands/setup";
import { Application } from "./application";

function parse_argv(args: string[]) {
  // const args = process.argv.slice(2);
  const options: Record<string, string | boolean> = {};
  args.forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      options[key] = value || true;
    }
  });
  return options;
}

async function main() {
  const app = new Application({ root_path: process.cwd() });
  const args = parse_argv(process.argv);

  console.log("应用信息");
  // console.log("项目当前目录", app.root_path);
  // console.log("项目所在目录", __dirname);
  // const files = await fs.readdir(__dirname);
  // console.log(files);
  console.log("静态资源目录", app.assets);
  console.log("数据库文件", app.database_path);

  const public_path = path.join(__dirname, "public");
  // console.log("三方包列表", await fs.readdir(path.join(__dirname, "node_modules", "@prisma")));
  // console.log("next dir", path.resolve("."));
  // const pkg = require(path.join(__dirname, "package.json"));
  // console.log(pkg);
  process.env.DATABASE_PATH = `file://${app.database_path}`;
  const r = await setup({ app });
  if (r.error) {
    console.log("初始化失败", r.error.message);
    return;
  }
  const DEFAULT_PORT = 3100;
  const { port = DEFAULT_PORT } = args;
  start({
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
    // pathname: admin === null ? "/setup" : "/admin",
    pathname: "/admin",
    assets: app.assets,
  }).then((res) => {
    if (res.error) {
      console.log(res.error.message);
      return;
    }
    const { host, port, pathname } = res.data;
    console.log(`> Ready on http://${host}:${port}${pathname}`);
  });
}

main();
