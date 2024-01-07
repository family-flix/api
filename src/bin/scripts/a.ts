import { MediaTypes, ResourceSyncTaskStatus } from "@/constants";
import { Application } from "@/domains/application";
import { MediaProfileClient } from "@/domains/media_profile";
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
  const profile_client_r = await MediaProfileClient.New({
    assets: app.assets,
    token: "c2e5d34999e27f8e0ef18421aa5dec38",
    store,
  });
  if (profile_client_r.error) {
    console.log(profile_client_r.error.message);
    return;
  }
  const client = profile_client_r.data;
  console.log("Start");
  const list = await store.prisma.parsed_media_source.findMany({
    include: {
      parsed_media: {
        include: {
          media_profile: true,
        },
      },
      drive: true,
    },
    orderBy: [
      {
        episode_text: "asc",
      },
      {
        created: "desc",
      },
    ],
    take: 10,
  });
  console.log(list);
  //   await walk_model_with_cursor({
  //     fn(extra) {
  //       return store.prisma.parsed_media_source.findMany({
  //         ...extra,
  //       });
  //     },
  //     async handler(data, index, finish) {
  //       await store.prisma.resource_sync_task.update({
  //         where: {
  //           id: data.id,
  //         },
  //         data: {
  //           status: ResourceSyncTaskStatus.WorkInProgress,
  //         },
  //       });
  //     },
  //   });
  console.log("Success");
}

main();
