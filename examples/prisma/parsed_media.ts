import { MediaTypes } from "@/constants";
import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { parse_argv } from "@/utils/server";

/**
 * yarn vite-node playground.ts -- -- -a 1 -b
 * { a: '1', b: true }
 */

async function main() {
  const args = process.argv.slice(2);
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.parsed_media.findMany({
        ...extra,
      });
    },
    async batch_handler(list, index) {
      console.log(index);
      await store.prisma.parsed_media.deleteMany({
        where: {
          id: {
            in: list.map((media) => media.id),
          },
        },
      });
    },
  });

  // const name = "ted.lasso";
  // const original_name = "";
  // const season = {
  //   season_text: "S01",
  // };
  // const existing_parsed_media = await store.prisma.parsed_media.findFirst({
  //   where: {
  //     type: MediaTypes.Season,
  //     OR: [
  //       {
  //         name,
  //         season_text: season.season_text,
  //       },
  //       {
  //         AND: [
  //           {
  //             original_name: {
  //               not: null,
  //             },
  //           },
  //           {
  //             original_name: {
  //               not: "",
  //             },
  //           },
  //           {
  //             original_name,
  //           },
  //         ],
  //         season_text: season.season_text,
  //       },
  //     ],
  //   },
  // });
  // console.log(existing_parsed_media);

  console.log("Completed");
}

main();
