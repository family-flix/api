import { store } from "@/store";

async function main() {
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
