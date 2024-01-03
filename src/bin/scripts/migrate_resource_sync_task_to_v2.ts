import { ResourceSyncTaskStatus } from "@/constants";
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
      return store.prisma.bind_for_parsed_tv.findMany({
        include: {
          season: {
            include: {
              tv: {
                include: {
                  profile: true,
                },
              },
              profile: true,
            },
          },
          user: true,
        },
        ...extra,
      });
    },
    async handler(data, index, finish) {
      console.log(index);
      const {
        id,
        url,
        file_id,
        name,
        file_id_link_resource,
        file_name_link_resource,
        in_production,
        invalid,
        created,
        updated,
        season,
        drive_id,
        user,
      } = data;
      const existing = await store.prisma.resource_sync_task.findFirst({
        where: {
          id,
        },
      });
      if (existing) {
        return;
      }
      const matched_media = await (async () => {
        if (!season) {
          return null;
        }
        const { profile } = season;
        const r = parseJSONStr<{ tmdb_id: string }>(profile.sources);
        if (r.error) {
          console.log(profile.name, "没有记录 tmdb_id");
          return null;
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
          return null;
        }
        return matched_media;
      })();
      await store.prisma.resource_sync_task.create({
        data: {
          id: r_id(),
          created,
          updated,
          status: (() => {
            if (in_production === 0) {
              return ResourceSyncTaskStatus.Completed;
            }
            if (matched_media) {
              return ResourceSyncTaskStatus.WorkInProgress;
            }
            return ResourceSyncTaskStatus.WaitSetProfile;
          })(),
          url,
          name,
          file_id_link_resource,
          file_name_link_resource,
          invalid: invalid!,
          file_id,
          media_id: matched_media ? matched_media.id : null,
          drive_id,
          user_id: user.id,
        },
      });
    },
  });
  console.log("Success");
}

main();
