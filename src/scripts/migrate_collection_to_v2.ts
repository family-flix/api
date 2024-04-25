import { CollectionTypes } from "@/constants";
import { Application } from "@/domains/application";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { parseJSONStr, r_id } from "@/utils";

async function main() {
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
  console.log("Start");
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.collection.findMany({
        where: {
          type: CollectionTypes.Manually,
        },
        include: {
          movies: {
            include: {
              profile: true,
            },
          },
          seasons: {
            include: {
              tv: {
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
    async handler(data, index) {
      const { id, title, desc, type, sort, medias: medias_str, seasons, movies, created, updated, user_id } = data;
      const existing = await store.prisma.collection_v2.findFirst({
        where: {
          id,
        },
      });
      if (existing) {
        return;
      }
      const medias = [];
      for (let i = 0; i < seasons.length; i += 1) {
        const season = seasons[i];
        const { profile } = season.tv;
        const r = parseJSONStr<{ tmdb_id: string }>(profile.sources);
        if (r.error) {
          console.log(profile.name, "没有记录 tmdb_id");
          continue;
        }
        const { tmdb_id } = r.data;
        const { season_number } = season;
        const media_profile_id = [tmdb_id, season_number].join("/");
        const matched_media = await store.prisma.media.findFirst({
          where: {
            profile_id: media_profile_id,
            user_id,
          },
          include: {
            profile: true,
          },
        });
        if (!matched_media) {
          console.log(profile.name, "没有对应的季", season_number);
          continue;
        }
        medias.push(matched_media);
      }
      for (let i = 0; i < movies.length; i += 1) {
        const movie = movies[i];
        const { profile } = movie;
        const r = parseJSONStr<{ tmdb_id: string }>(profile.sources);
        if (r.error) {
          console.log(profile.name, "没有记录 tmdb_id");
          continue;
        }
        const { tmdb_id } = r.data;
        const media_profile_id = [tmdb_id].join("/");
        const matched_media = await store.prisma.media.findFirst({
          where: {
            profile_id: media_profile_id,
            user_id,
          },
          include: {
            profile: true,
          },
        });
        if (!matched_media) {
          console.log(profile.name, "没有匹配的电影1");
          continue;
        }
        medias.push(matched_media);
      }
      await store.prisma.collection_v2.create({
        data: {
          id,
          created,
          updated,
          title,
          desc,
          type,
          sort,
          medias: {
            connect: medias.map((m) => {
              return {
                id: m.id,
              };
            }),
          },
          user_id,
        },
      });
    },
  });
  console.log("Success");
}

main();
