import { FileType, ResourceSyncTaskStatus } from "@/constants";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule/v2";
import { walk_model_with_cursor } from "@/domains/store/utils";

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
  const schedule = new ScheduleTask({ app, store });
  console.log("Start");
  await schedule.walk_drive(async (drive, user) => {
    const r = await DriveAnalysis.New({
      drive,
      store,
      user,
      assets: app.assets,
      on_print(v) {
        console.log(v.to_json());
      },
    });
    if (r.error) {
      console.log(r.error.message);
      return;
    }
    const analysis = r.data;
    await walk_model_with_cursor({
      fn(extra) {
        return store.prisma.resource_sync_task.findMany({
          where: {
            status: ResourceSyncTaskStatus.WorkInProgress,
            drive_id: drive.id,
            user_id: user.id,
          },
          ...extra,
        });
      },
      async batch_handler(list) {
        await analysis.run2(
          list.map((folder) => {
            const { file_id_link_resource, file_name_link_resource } = folder;
            return {
              file_id: file_id_link_resource,
              name: file_name_link_resource,
              type: FileType.Folder,
            };
          })
        );
      },
    });
  });
  console.log("Success");
}

main();
