import util from "util";

import dayjs from "dayjs";

import { Application } from "@/domains/application";

const OUTPUT_PATH = "/Users/litao/Documents/workspaces/family-flix/dev-output";

const app = new Application({
  root_path: OUTPUT_PATH,
});
const store = app.store;

async function fetch_episodes(params: { cursor: string; direction?: "left" | "center" | "right" }) {
  const { cursor, direction = "center" } = params;
  if (direction === "center") {
    const after_episodes = await store.prisma.episode.findMany({
      where: {
        season_id: "yM7MEVUDnN0N8BO",
      },
      take: 5,
      cursor: {
        id: cursor,
      },
      orderBy: {
        episode_number: "desc",
      },
    });
    const prev_episodes = await store.prisma.episode.findMany({
      where: {
        season_id: "yM7MEVUDnN0N8BO",
      },
      take: 5,
      cursor: {
        id: cursor,
      },
      orderBy: {
        episode_number: "asc",
      },
    });
    const episodes = [...after_episodes.slice(1).reverse(), ...prev_episodes];
    return episodes;
  }
  const episodes = await store.prisma.episode.findMany({
    where: {
      season_id: "yM7MEVUDnN0N8BO",
    },
    take: 11,
    cursor: {
      id: cursor,
    },
    orderBy: {
      episode_number: direction === "left" ? "desc" : "asc",
    },
  });
  const ee = direction === "left" ? episodes.reverse() : episodes;
  return direction === "left" ? ee.slice(0, ee.length - 1) : ee.slice(1);
}

async function main() {
  const episodes = await fetch_episodes({
    cursor: "MeRABucT0QOkBSf",
  });
  console.log(episodes.map((e) => e.episode_text));
  // console.log(
  //   util.inspect(
  //     episodes.map((e) => e.episode_text),
  //     {
  //       depth: 5,
  //     }
  //   )
  // );
  const next_episodes = await fetch_episodes({
    cursor: episodes[0].id,
    direction: "left",
    // cursor: episodes[episodes.length - 1].id,
    // direction: "right",
  });
  console.log(next_episodes.map((e) => e.episode_text));
}

main();
