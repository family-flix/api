require("dotenv").config();

import { store } from "@/store";

async function main() {
  const tv = {
    name: "因为你",
    original_name: "",
  };
  // await store.prisma.tV.update({
  //   where: {
  //     id: "3cdZ5xr3hXQCpkI",
  //   },
  //   data: {
  //     original_name: null,
  //   },
  // });
  const res = await store.prisma.tv.findFirst({
    where: {
      profile: {
        OR: [
          {
            name: {
              // not: null,
              contains: tv.name,
            },
          },
          {
            original_name: {
              // not: null,
              contains: tv.original_name,
            },
          },
        ],
      },
    },
    include: {
      profile: true,
    },
  });
  console.log(res);
  // const res = await store.prisma.episode.update({
  //   where: {
  //     id: "kh5TtHbRSMTeogQ",
  //   },
  //   data: {
  //     tv_id: "6MISmavsGBaFEtK",
  //   },
  // });
  // console.log(res);
}

main();
