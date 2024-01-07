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
      return store.prisma.play_history.findMany({
        include: {
          tv: {
            include: {
              profile: true,
            },
          },
          season: true,
          episode: true,
          movie: {
            include: {
              profile: true,
            },
          },
          member: {
            include: {
              user: true,
            },
          },
        },
        ...extra,
      });
    },
    async handler(data, index) {
      console.log(index);
      const { id, tv, season, episode, movie, file_id, duration, current_time, thumbnail, created, updated, member } =
        data;
      const existing = await store.prisma.play_history_v2.findFirst({
        where: {
          id,
        },
      });
      if (existing) {
        return;
      }
      const { user } = member;
      if (tv && season && episode) {
        const { profile } = tv;
        const r = parseJSONStr<{ tmdb_id: string }>(profile.sources);
        if (r.error) {
          console.log(profile.name, "没有记录 tmdb_id");
          return;
        }
        const { tmdb_id } = r.data;
        const { season_number } = season;
        const media_profile_id = [tmdb_id, season_number].join("/");
        const matched_media = await store.prisma.media.findFirst({
          where: {
            profile_id: media_profile_id,
            user_id: user.id,
          },
          include: {
            profile: true,
          },
        });
        if (!matched_media) {
          console.log(profile.name, "没有对应的季", season_number);
          return;
        }
        const { episode_number } = episode;
        const media_source_profile_id = [media_profile_id, episode_number].join("/");
        const matched_media_source = await store.prisma.media_source.findFirst({
          where: {
            profile_id: media_source_profile_id,
            user_id: user.id,
          },
          include: {
            profile: true,
          },
        });
        if (!matched_media_source) {
          console.log(profile.name, "没有对应的剧集", season_number, episode_number);
          return;
        }
        // await store.prisma.play_history_v2.create({
        //   data: {
        //     id,
        //     created,
        //     updated,
        //     duration: duration || 0,
        //     current_time: current_time || 0,
        //     text: (() => {
        //       return [matched_media.profile.name].join("/");
        //     })(),
        //     thumbnail_path: thumbnail,
        //     file_id,
        //     media_id: matched_media.id,
        //     media_source_id: matched_media_source.id,
        //     member_id: member.id,
        //   },
        // });
        return;
      }
      if (movie) {
        const { profile } = movie;
        const r = parseJSONStr<{ tmdb_id: string }>(profile.sources);
        if (r.error) {
          console.log(profile.name, "没有记录 tmdb_id");
          return;
        }
        const { tmdb_id } = r.data;
        const media_profile_id = [tmdb_id].join("/");
        const matched_media = await store.prisma.media.findFirst({
          where: {
            profile_id: media_profile_id,
            user_id: user.id,
          },
          include: {
            profile: true,
          },
        });
        if (!matched_media) {
          console.log(profile.name, "没有匹配的电影1");
          return;
        }
        const media_source_profile_id = [media_profile_id].join("/");
        const matched_media_source = await store.prisma.media_source.findFirst({
          where: {
            profile_id: media_source_profile_id,
            user_id: user.id,
          },
          include: {
            profile: true,
          },
        });
        if (!matched_media_source) {
          console.log(profile.name, "没有匹配的电影2");
          return;
        }
        // await store.prisma.play_history_v2.create({
        //   data: {
        //     id,
        //     created,
        //     updated,
        //     duration: duration || 0,
        //     current_time: current_time || 0,
        //     text: (() => {
        //       return [matched_media.profile.name].join("/");
        //     })(),
        //     thumbnail_path: thumbnail,
        //     file_id,
        //     media_id: matched_media.id,
        //     media_source_id: matched_media_source.id,
        //     member_id: member.id,
        //   },
        // });
        return;
      }
    },
  });
  console.log("Success");
}

main();
