import dayjs from "dayjs";

import { ResourceSyncTaskStatus } from "@/constants";
import { Application } from "@/domains/application";
import { ResourceSyncTask } from "@/domains/resource_sync_task/v2";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { User } from "@/domains/user";
import { parseJSONStr, r_id, sleep } from "@/utils";

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
  console.log("Start");
  const drive1 = await store.prisma.drive.findFirst({
    where: {
      unique_id: "880986603",
    },
  });
  if (!drive1) {
    return;
  }
  const drive2 = await store.prisma.drive.findFirst({
    where: {
      unique_id: "2549939630",
    },
  });
  if (!drive2) {
    return;
  }
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.user.findMany({
        ...extra,
      });
    },
    async handler(data, index, finish) {
      const r = await User.Get({ id: data.id }, store);
      if (r.error) {
        return;
      }
      const user = r.data;
      await walk_model_with_cursor({
        fn(extra) {
          return store.prisma.resource_sync_task.findMany({
            where: {
              status: 3,
              drive_id: drive1.id,
            },
            include: {
              media: {
                include: {
                  profile: true,
                },
              },
            },
            orderBy: {
              created: "desc",
            },
            ...extra,
          });
        },
        async handler(data, index) {
          console.log(index);
          const { url, file_id, name, pwd } = data;
          const existing = await store.prisma.resource_sync_task.findFirst({
            where: {
              url,
              drive_id: drive2.id,
            },
          });
          if (existing) {
            if (!existing.media_id) {
              await store.prisma.resource_sync_task.update({
                where: {
                  id: existing.id,
                },
                data: {
                  updated: dayjs().toISOString(),
                  status: ResourceSyncTaskStatus.WorkInProgress,
                  media_id: data.media_id,
                },
              });
            }
            await store.prisma.resource_sync_task.delete({
              where: {
                id: data.id,
              },
            });
            return;
          }
          const r = await ResourceSyncTask.Transfer(
            {
              url,
              pwd,
              file_id,
              file_name: name,
              drive_id: drive2.id,
            },
            {
              user,
              app,
              store,
            }
          );
          if (r.error) {
            return;
          }
          await sleep(10 * 1000);
        },
      });
    },
  });
  console.log("Success");
}

main();
