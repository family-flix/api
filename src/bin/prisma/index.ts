import dayjs from "dayjs";

import { store } from "@/store";
import { r_id } from "@/utils";

async function main() {
  const where = {
    type: 1,
    OR: [
      { name: "继承之战", season_text: "S01", air_year: "" || null },
      {
        AND: [
          {
            original_name: "" || null,
          },
          {
            original_name: {
              not: null,
            },
          },
        ],
        season_text: "S01",
        air_year: null,
      },
    ],
    drive_id: "iPsTHqelttCdC3s",
    user_id: "jd1CxJ3X4mquQdS",
  };
  const list = await store.prisma.parsed_media.findFirst({ where });
  console.log(list);
  // const episode = await store.prisma.episode.findFirst({
  //   include: {
  //     tv: {
  //       include: {
  //         profile: true,
  //       },
  //     },
  //     season: {
  //       include: {
  //         profile: {
  //           include: {
  //             persons: {
  //               include: {
  //                 profile: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  // });
  // if (!episode) {
  //   console.log("没有 episode");
  //   return;
  // }
  // const member = await store.prisma.member.findFirst({});
  // if (!member) {
  //   console.log("没有 episode");
  //   return;
  // }
  // await store.prisma.member_diary.create({
  //   data: {
  //     id: r_id(),
  //     media_source_id: episode.id,
  //     day: dayjs().format("YYYY-MM-DD"),
  //     member_id: member.id,
  //   },
  // });
}

async function delete_records() {
  await store.prisma.member_diary.deleteMany({});
}

main();
// delete_records();
