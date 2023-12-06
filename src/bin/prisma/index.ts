import dayjs from "dayjs";

import { store } from "@/store";
import { r_id } from "@/utils";

async function main() {
  const episode = await store.prisma.episode.findFirst({
    include: {
      tv: {
        include: {
          profile: true,
        },
      },
      season: {
        include: {
          profile: {
            include: {
              persons: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!episode) {
    console.log("没有 episode");
    return;
  }
  const member = await store.prisma.member.findFirst({});
  if (!member) {
    console.log("没有 episode");
    return;
  }
  await store.prisma.member_diary.create({
    data: {
      id: r_id(),
      episode_id: episode.id,
      day: dayjs().format("YYYY-MM-DD"),
      member_id: member.id,
    },
  });
}

async function delete_records() {
  await store.prisma.member_diary.deleteMany({});
}

main();
// delete_records();
