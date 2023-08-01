import { store } from "@/store";

async function main() {
  const tv = {
    id: "AXnNg4VpjF5QWBb",
  };
  //   const episodes = await store.prisma.episode.findMany({
  //     where: {
  //       tv_id: tv.id,
  //     },
  //   });
  const episodes = await store.prisma.episode.groupBy({
    where: {
      tv_id: tv.id,
    },
    by: ["season_id", "season_number"],
  });
  console.log(episodes);
}

main();
