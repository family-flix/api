import { Application } from "@/domains/application";
import { MediaProfileClient } from "@/domains/media_profile";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { parseJSONStr, r_id } from "@/utils";

async function main() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  console.log("Start");
  const profile_r = await MediaProfileClient.New({
    tmdb: { token: "c2e5d34999e27f8e0ef18421aa5dec38" },
    assets: app.assets,
    store,
  });
  if (profile_r.error) {
    console.log(profile_r.error.message);
    return;
  }
  const client = profile_r.data;
  const img_proxy = "https://proxy.f2x.fun/api/tmdb_site";
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.media_profile.findMany({
        where: {
          OR: [
            {
              poster_path: {
                contains: "themoviedb",
              },
            },
            {
              backdrop_path: {
                contains: "themoviedb",
              },
            },
          ],
        },
        ...extra,
      });
    },
    async handler(media_profile, index) {
      const { id, name, original_name, type, poster_path, backdrop_path, created, updated } = media_profile;
      console.log(name, original_name);
      if (poster_path && poster_path.includes("themoviedb")) {
        const r = await client.download_image(poster_path, "poster");
        if (r !== poster_path) {
          await store.prisma.media_profile.update({
            where: {
              id,
            },
            data: {
              poster_path: r,
            },
          });
        }
      }
      if (backdrop_path && backdrop_path.includes("themoviedb")) {
        const r = await client.download_image(backdrop_path, "backdrop");
        if (r !== backdrop_path) {
          await store.prisma.media_profile.update({
            where: {
              id,
            },
            data: {
              backdrop_path: r,
            },
          });
        }
      }
    },
  });
  console.log("Success");
}

main();
