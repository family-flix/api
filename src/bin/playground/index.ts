import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule";
import { DriveTypes } from "@/domains/drive/constants";

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
  const schedule = new ScheduleTask({ app, store });

  const page = 1;
  const page_size = 10;
  const list = await store.prisma.season.findMany({
    where: {
      AND: [
        {
          profile: {
            name: {
              contains: "狂赌之渊",
            },
          },
        },
      ],
    },
    include: {
      _count: true,
      profile: true,
      sync_tasks: true,
      tv: {
        include: {
          _count: true,
          profile: true,
        },
      },
      episodes: {
        where: {
          parsed_episodes: {
            some: {},
          },
        },
        include: {
          profile: true,
          _count: true,
        },
        orderBy: {
          episode_number: "desc",
        },
      },
      parsed_episodes: true,
    },
    orderBy: {
      profile: { air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  console.log(list);
}

main();
