import { Application } from "@/domains/application";
import { walk_model_with_cursor } from "@/domains/store/utils";

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
  console.log("Start");
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.media_profile.findMany({
        include: {
          series: true,
        },
        ...extra,
      });
    },
    async batch_handler(list, index) {
      for (let i = 0; i < list.length; i += 1) {
        const { id, original_name, tips, series, douban_id } = list[i];
        if (!series) {
          return;
        }
        if (original_name && series.original_name) {
          await store.prisma.media_profile.update({
            where: {
              id,
            },
            data: {
              original_name: series.original_name,
            },
          });
        }
        // if (douban_id && tips) {
        //   await store.prisma.media_profile.update({
        //     where: {
        //       id,
        //     },
        //     data: {
        //       tips: null,
        //     },
        //   });
        // }
      }
    },
  });
  console.log("Success");
}

main();
