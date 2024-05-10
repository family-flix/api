import { Application } from "@/domains/application";
import { MediaProfileClient } from "@/domains/media_profile";
import { DoubanClient } from "@/domains/media_profile/douban";
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
  //   const r1 = await client.search("曾少年");
  //   if (r1.error) {
  //     console.log(r1.error.message);
  //     return;
  //   }
  //   const results = r1.data.list;
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.media_profile.findMany({
        ...extra,
      });
    },
    async batch_handler(list, index) {
      for (let i = 0; i < list.length; i += 1) {
        const { id, tips, douban_id } = list[i];
        if (douban_id && tips) {
          await store.prisma.media_profile.update({
            where: {
              id,
            },
            data: {
              tips: null,
            },
          });
        }
      }
    },
  });
  console.log("Success");
}

main();
