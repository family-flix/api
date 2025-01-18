import { MediaTypes, ResourceSyncTaskStatus } from "@/constants";
import { Application } from "@/domains/application";
import { TMDBClient } from "@/domains/media_profile/tmdb";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { parseJSONStr } from "@/utils";

async function main() {
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
  // const profile_client_r = await MediaProfileClient.New({
  //   assets: app.assets,
  //   token: TMDBClient.TOKEN,
  //   store,
  // });
  // if (profile_client_r.error) {
  //   console.log(profile_client_r.error.message);
  //   return;
  // }
  // const client = profile_client_r.data;
  console.log("Start");
  // const list = await store.prisma.parsed_media.findMany({
  //   where: {
  //     parsed_sources: {
  //       none: {},
  //     },
  //   },
  // });
  // console.log(list);
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.parsed_media.findMany({
        where: {
          parsed_sources: {
            none: {},
          },
        },
        ...extra,
      });
    },
    async handler(data, index, finish) {
      console.log(data.name);
      await store.prisma.parsed_media.delete({
        where: {
          id: data.id,
        },
      });
    },
  });
  console.log("Success");
}

main();
