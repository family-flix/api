/**
 * 获取指定时间内新增影视剧
 */
import dayjs from "dayjs";

import { CollectionTypes, MediaTypes } from "@/constants";
import { Application } from "@/domains/application";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { parseJSONStr, r_id } from "@/utils";

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
  const range = [dayjs().startOf("day").toISOString(), dayjs().endOf("day").toISOString()];
  const result = await store.list_with_cursor({
    fetch: async (extra) => {
      return await store.prisma.media_source.findMany({
        where: {
          created: {
            gte: range[0],
            lt: range[1],
          },
        },
        include: {
          profile: true,
          media: {
            include: {
              profile: true,
            },
          },
        },
        distinct: ["media_id"],
        orderBy: [
          {
            created: "desc",
          },
        ],
        ...extra,
      });
    },
    page_size: 20,
    next_marker: "",
  });
  const data = {
    next_marker: result.next_marker,
    list: result.list.map((source) => {
      const {
        id,
        profile,
        media: { id: media_id, type, profile: media_profile },
        created,
      } = source;
      return {
        id,
        media_id,
        name: media_profile.name,
        poster_path: media_profile.poster_path,
        air_date: media_profile.air_date,
        text: (() => {
          if (type === MediaTypes.Movie) {
            return null;
          }
          return `${profile.order}、${profile.name}`;
        })(),
        created_at: created,
      };
    }),
  };
  console.log(data);
  console.log("Success");
}

main();
