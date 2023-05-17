import { store } from "@/store";

async function main() {
  const tv = {
    name: "外婆D新世界",
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
  // const res = await store.prisma.tV.findFirst({
  //   where: {
  //     OR: [
  //       {
  //         name: {
  //           not: null,
  //           equals: tv.name,
  //         },
  //       },
  //       {
  //         original_name: {
  //           not: null,
  //           equals: tv.original_name,
  //         },
  //       },
  //     ],
  //   },
  // });
  const res = await store.prisma.episode.update({
    where: {
      id: "kh5TtHbRSMTeogQ",
    },
    data: {
      tv_id: "6MISmavsGBaFEtK",
    },
  });
  console.log(res);
}

main();
