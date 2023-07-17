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
function brand() {
  console.log();
  [
    "    ______                _ __      _________     ",
    "   / ____/___ _____ ___  (_) /_  __/ ____/ (_)_  _",
    "  / /_  / __ `/ __ `__ \\/ / / / / / /_  / / / |_/",
    " / __/ / /_/ / / / / / / / / /_/ / __/ / / />  <  ",
    "/_/    \\__,_/_/ /_/ /_/_/_/\\__, /_/   /_/_/_/|_|  ",
    "                          /____/                   ",
  ].map((text) => {
    console.log(text);
  });
}

main();
