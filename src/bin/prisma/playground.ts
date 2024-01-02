import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule";
import { parse_argv } from "@/utils/server";

/**
 * yarn vite-node playground.ts -- -- -a 1 -b
 * { a: '1', b: true }
 */

async function main() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const start = performance.now();
  app.startInterval(() => {
    const end = performance.now();
    console.log("hello1", start - end);
  }, 3000);
  app.startInterval(() => {
    const end = performance.now();
    console.log("hello2", start - end);
  }, 3000);
  app.startInterval(() => {
    const end = performance.now();
    console.log("hello3", start - end);
  }, 10000);
}

main();
