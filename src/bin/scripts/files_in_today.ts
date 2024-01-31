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
  const range = [
    start ? dayjs(start).toISOString() : dayjs().startOf("day").toISOString(),
    end ? dayjs(end).toISOString() : dayjs().endOf("day").toISOString(),
  ];
  let size_count = 0;
  //   let max_size_file: {
  //     name: string;
  //     parent_paths: string;
  //     size: number;
  //   }[] = [];
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.file.findMany({
        where: {
          created: {
            gte: range[0],
            lt: range[1],
          },
        },
        orderBy: [
          {
            created: "desc",
          },
        ],
        ...extra,
      });
    },
    batch_handler(list, index) {
      size_count += list.reduce((total, f) => {
        return total + f.size || 0;
      }, 0);
    },
  });
  console.log(bytes_to_size(size_count));
  const files = await store.prisma.file.findMany({
    where: {
      created: {
        gte: range[0],
        lt: range[1],
      },
    },
    orderBy: {
      size: "desc",
    },
    take: 10,
  });
  const records = files.map((f) => {
    return {
      size: f.size,
      filepath: [f.parent_paths, f.name].join("/"),
    };
  });
  console.log(records);
  console.log("Success");
}

main();
