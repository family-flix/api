import { Application } from "@/domains/application";
import { DatabaseStore } from "@/domains/store";
import { MovieProfileRecord, TVProfileRecord } from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { parseJSONStr } from "@/utils";

type AnswerPayload = Partial<{
  msg: string;
  season: {
    id: string;
    name: string;
    air_date: string | null;
    poster_path: string | null;
  };
  movie: {
    id: string;
    name: string;
    air_date: string | null;
    poster_path: string | null;
  };
}>;
async function find_matched_season(body: {
  profile: TVProfileRecord;
  season_number: number;
  user_id: string;
  store: DatabaseStore;
}) {
  const { profile, season_number, user_id, store } = body;
  const r = parseJSONStr<{ tmdb_id: string }>(profile.sources);
  if (r.error) {
    console.log(profile.name, "没有记录 tmdb_id");
    return null;
  }
  const { tmdb_id } = r.data;
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
    return null;
  }
  return matched_media;
}
async function find_matched_movie(body: { profile: MovieProfileRecord; user_id: string; store: DatabaseStore }) {
  const { profile, user_id, store } = body;
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
      user_id,
    },
    include: {
      profile: true,
    },
  });
  if (!matched_media) {
    return null;
  }
  return matched_media;
}

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
      return store.prisma.member_notification.findMany({
        where: {
          member_id: "2thR5Xhl2pMQHOs",
        },
        include: {
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
      const { id, content, status, created, member } = data;
      if (content === null) {
        return;
      }
      const { msg, movie, season } = JSON.parse(content) as AnswerPayload;
      if (season) {
        const s = await store.prisma.season.findFirst({
          where: {
            id: season.id,
            user_id: member.user.id,
          },
          include: {
            tv: {
              include: {
                profile: true,
              },
            },
          },
        });
        if (!s) {
          console.log(`${season.name} 没有匹配记录`);
          return;
        }
        const media = await find_matched_season({
          profile: s.tv.profile,
          season_number: s.season_number,
          user_id: member.user.id,
          store,
        });
        if (!media) {
          console.log(`${season.name} 没有匹配记录2`);
          return;
        }
        const new_content: AnswerPayload = {
          msg,
          season: {
            id: media.id,
            name: media.profile.name,
            poster_path: media.profile.poster_path,
            air_date: media.profile.air_date,
          },
        };
        await store.prisma.member_notification.update({
          where: {
            id,
          },
          data: {
            content: JSON.stringify(new_content),
          },
        });
        return;
      }
      if (movie) {
        const s = await store.prisma.movie.findFirst({
          where: {
            id: movie.id,
            user_id: member.user.id,
          },
          include: {
            profile: true,
          },
        });
        if (!s) {
          console.log(`${movie.name} 没有匹配记录`);
          return;
        }
        const media = await find_matched_movie({
          profile: s.profile,
          user_id: member.user.id,
          store,
        });
        if (!media) {
          console.log(`${movie.name} 没有匹配记录2`);
          return;
        }
        const new_content: AnswerPayload = {
          msg,
          movie: {
            id: media.id,
            name: media.profile.name,
            poster_path: media.profile.poster_path,
            air_date: media.profile.air_date,
          },
        };
        await store.prisma.member_notification.update({
          where: {
            id,
          },
          data: {
            content: JSON.stringify(new_content),
          },
        });
        return;
      }
    },
  });
  console.log("Success");
}

main();
