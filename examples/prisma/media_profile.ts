import { MediaTypes } from "@/constants";
import { Application } from "@/domains/application";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { parse_argv } from "@/utils/server";

/**
 * yarn vite-node playground.ts -- -- -a 1 -b
 * { a: '1', b: true }
 */

async function main() {
  const args = process.argv.slice(2);
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;

  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.media_series_profile.findMany({
        ...extra,
      });
    },
    async batch_handler(list, index) {
      console.log(index);
      await store.prisma.media_series_profile.deleteMany({
        where: {
          id: {
            in: list.map((media) => media.id),
          },
        },
      });
    },
  });
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.media_profile.findMany({
        ...extra,
      });
    },
    async batch_handler(list, index) {
      console.log(index);
      await store.prisma.media_profile.deleteMany({
        where: {
          id: {
            in: list.map((media) => media.id),
          },
        },
      });
    },
  });

  console.log("Completed");
}

main();
