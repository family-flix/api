import { MediaTypes } from "@/constants";
import { Application } from "@/domains/application";
import { MediaProfileClient } from "@/domains/media_profile";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { parseJSONStr } from "@/utils";

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
      return store.prisma.parsed_media.findMany({
        where: {
          type: MediaTypes.Season,
          media_profile_id: null,
        },
        include: {
          parsed_sources: true,
          user: true,
        },
        ...extra,
      });
    },
    async handler(data, index, finish) {
      console.log(index);
      const { id, name, original_name, season_text, created, updated, drive_id, user } = data;
      console.log(name, original_name, season_text);
      if (!season_text) {
        return;
      }
      const existing = await store.prisma.parsed_tv.findFirst({
        where: {
          OR: [
            {
              name,
            },
            {
              AND: [
                {
                  original_name: {
                    not: null,
                  },
                },
                {
                  original_name,
                },
              ],
            },
          ],
          tv_id: {
            not: null,
          },
        },
        include: {
          tv: {
            include: {
              profile: true,
            },
          },
        },
      });
      if (!existing) {
        console.log("没有已匹配的记录");
        return;
      }
      const { tv } = existing;
      if (!tv) {
        return;
      }
      const { profile } = tv;
      const r = parseJSONStr<{ tmdb_id: string }>(profile.sources);
      if (r.error) {
        console.log(profile.name, "没有记录 tmdb_id");
        return null;
      }
      const { tmdb_id } = r.data;
      const profile_client_r = await MediaProfileClient.New({
        assets: app.assets,
        token: "c2e5d34999e27f8e0ef18421aa5dec38",
        store,
      });
      if (profile_client_r.error) {
        console.log(profile_client_r.error.message);
        return;
      }
      const client = profile_client_r.data;
      const p = await client.cache_tv_profile({ id: tmdb_id });
      if (p.error) {
        console.log(p.error.message);
        return;
      }
      const media_profile = p.data;
      const season_number = (() => {
        const v = season_text.match(/[sS]([0-9]{1,})/);
        if (v) {
          return Number(v[1]);
        }
        return null;
      })();
      if (season_number === null) {
        console.log("season_number is", season_number);
        return;
      }
      const profiles = media_profile.media_profiles;
      const matched = profiles.find((pp) => pp.order === season_number);
      if (!matched) {
        console.log("没有匹配的季");
        return;
      }
      await store.prisma.parsed_media.update({
        where: {
          id,
        },
        data: {
          media_profile_id: matched.id,
        },
      });
      await client.cache_season_profile({ tv_id: tmdb_id, season_number });
    },
  });
  console.log("Success");
}

main();
