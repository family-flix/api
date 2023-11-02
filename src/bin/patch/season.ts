import { walk_model_with_cursor } from "@/domains/store/utils";
import { MediaSearcher } from "@/domains/searcher";
import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule";

async function walk_season() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  //   const DATABASE_PATH = "file://$OUTPUT_PATH/data/family-flix.db?connection_limit=1";
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  const schedule = new ScheduleTask({ app, store });
  await schedule.walk_drive(async (drive, user) => {
    const searcher = new MediaSearcher({
      user,
      drive,
      assets: app.assets,
      store,
    });
    await walk_model_with_cursor({
      fn(extra) {
        return store.prisma.season.findMany({
          where: {},
          include: {
            tv: {
              include: {
                profile: true,
              },
            },
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
          ...extra,
        });
      },
      async handler(season) {
        if (season.season_number === 0) {
          return;
        }
        if (!season.tv) {
          return;
        }
        if (!season.tv.profile) {
          return;
        }
        // console.log(season.tv.profile.name, season.season_number);
        await searcher.insert_persons_of_season(season);
      },
    });
    await walk_model_with_cursor({
      fn(extra) {
        return store.prisma.movie.findMany({
          where: {},
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
          ...extra,
        });
      },
      async handler(movie) {
        if (!movie.profile) {
          return;
        }
        // console.log(season.tv.profile.name, season.season_number);
        await searcher.insert_persons_of_movie(movie);
      },
    });
  });
}

walk_season();
