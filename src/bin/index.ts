import path from "path";
import fs from "fs/promises";

import { start } from "./commands/start";
import { setup } from "./commands/setup";
import { has_setup } from "./utils";
import { Application } from "./application";

async function main() {
  const app = new Application({ root_path: process.cwd() });

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
  const initialized = await has_setup({ database_path: app.database_path });
  if (!initialized) {
    const r = await setup({ dir: app.database_dir, filename: app.database_name, public_path });
    if (r.error) {
      console.log(r.error.message);
      return;
    }
    console.log("初始化完成，准备启动应用");
  }
  start({
    port: 3100,
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
