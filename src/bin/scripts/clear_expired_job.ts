import { Application } from "@/domains/application";
import { walk_model_with_cursor } from "@/domains/store/utils";

async function clear_expired_job_outlines() {
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
      return store.prisma.resource_sync_task.findMany({
        ...extra,
      });
    },
    async batch_handler(list, i) {
      console.log(i);
      await store.prisma.resource_sync_task.deleteMany({
        where: {
          id: {
            in: list.map((d) => d.id),
          },
        },
      });
    },
  });
  console.log("Success");
}

clear_expired_job_outlines();
