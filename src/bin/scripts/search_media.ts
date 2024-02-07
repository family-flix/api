/**
 * 列出指定时间内新增的文件
 * 新增文件的大小，和最大的10个文件
 */
import dayjs from "dayjs";

import { CollectionTypes, MediaTypes } from "@/constants";
import { Application } from "@/domains/application";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { bytes_to_size, parseJSONStr, r_id } from "@/utils";

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
  const start = null;
  const end = null;
  //   const range = [
  //     start ? dayjs(start).toISOString() : dayjs().startOf("day").toISOString(),
  //     end ? dayjs(end).toISOString() : dayjs().endOf("day").toISOString(),
  //   ];
  const medias = await store.prisma.media.findMany({
    where: {
      profile: {
        AND: [
          {
            origin_country: {
              some: {
                id: {
                  contains: "KR",
                },
              },
            },
          },
        ],
      },
    },
    orderBy: {
      profile: {
        air_date: "desc",
      },
    },
    take: 20,
  });
  console.log(medias);
  console.log("Success");
}

main();
