import { Application } from "@/domains/application";
import dayjs from "dayjs";

const OUTPUT_PATH = "/apps/flix_prod";
const DATABASE_PATH = "file://$OUTPUT_PATH/data/family-flix.db?connection_limit=1";

const app = new Application({
  root_path: OUTPUT_PATH,
});
const store = app.store;

async function main() {
  const start = null;
  const end = null;
  const range = [
    start ? dayjs(start).toISOString() : dayjs().endOf("day").toISOString(),
    end ? dayjs(end).toISOString() : dayjs().startOf("day").toISOString(),
  ];
  const episodes = await store.prisma.episode.findMany({
    where: {
      created: {
        lt: range[0],
        gte: range[1],
      },
      // user_id: user.id,
    },
    include: {
      season: {
        include: {
          profile: true,
        },
      },
      tv: {
        include: {
          profile: true,
        },
      },
    },
    distinct: ["season_id"],
    orderBy: [
      {
        created: "desc",
      },
    ],
  });
  console.log(
    episodes.map((episode) => {
      const {
        episode_text,
        season,
        tv: { profile },
      } = episode;
      return {
        episode_text,
        name: profile.name,
      };
    })
  );
}

main();
