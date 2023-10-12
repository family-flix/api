import util from "util";

import dayjs from "dayjs";

import { Application } from "@/domains/application";

const OUTPUT_PATH = "/Users/litao/Documents/workspaces/family-flix/dev-output";
const DATABASE_PATH = "file://$OUTPUT_PATH/data/family-flix.db?connection_limit=1";

const app = new Application({
  root_path: OUTPUT_PATH,
});
const store = app.store;

async function main() {
  const profile = await store.prisma.season.findFirst({
    where: {
      id: "oqpAtuwrFG7oQo9",
      // episodes: {
      //   every: {
      //     parsed_episodes: {
      //       some: {},
      //     },
      //   },
      // },
    },
    include: {
      episodes: {
        where: {
          parsed_episodes: {
            some: {},
          },
        },
        orderBy: {
          episode_number: "asc",
        },
        include: {
          parsed_episodes: {
            select: {
              file_name: true,
            },
          },
        },
      },
    },
  });
  if (!profile) {
    return;
  }
  console.log(
    util.inspect(
      {
        ...profile,
        episodes: profile.episodes.map((episode) => {
          const { episode_text, parsed_episodes } = episode;
          return {
            episode_text,
            parsed_episodes,
          };
        }),
      },
      {
        depth: 5,
      }
    )
  );
}

main();
