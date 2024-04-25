/**
 * @file 遍历 folder 表进行操作
 */

import { walk_model_with_cursor } from "@/domains/store/utils";
import { Application } from "@/domains/application";

async function run() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  //   const DATABASE_PATH = "file://$OUTPUT_PATH/data/family-flix.db?connection_limit=1";
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  console.log("Start");
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.person_in_media.findMany({
        ...extra,
      });
    },
    async batch_handler(list, index) {
      await store.prisma.person_in_media.deleteMany({
        where: {
          id: {
            in: list.map((p) => p.id),
          },
        },
      });
    },
  });
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.person_profile.findMany({
        ...extra,
      });
    },
    async batch_handler(list, index) {
      await store.prisma.person_profile.deleteMany({
        where: {
          id: {
            in: list.map((p) => p.id),
          },
        },
      });
    },
  });
  console.log("Success");
}

run();
