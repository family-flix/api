import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule";
import { walk_model_with_cursor } from "@/domains/store/utils";
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
  const store = app.store;
  // const start = performance.now();
  await store.prisma.tv_profile_quick.deleteMany({});
  // await walk_model_with_cursor({
  //   fn(extra) {
  //     return store.prisma.member_diary.findMany({
  //       ...extra,
  //     });
  //   },
  //   async batch_handler(list, index) {
  //     console.log(index);
  //     await store.prisma.member_diary.deleteMany({
  //       where: {
  //         id: {
  //           in: list.map((media) => media.id),
  //         },
  //       },
  //     });
  //   },
  // });
}

main();
