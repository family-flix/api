/**
 * @file 遍历 folder 表进行操作
 */

const OUTPUT_PATH = "/apps/flix_prod";
const DATABASE_PATH = "file://$OUTPUT_PATH/data/family-flix.db?connection_limit=1";

import { Application } from "@/domains/application";
import { Drive } from "@/domains/drive";
import { ModelParam } from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";

const app = new Application({
  root_path: OUTPUT_PATH,
});
const store = app.store;

async function run() {
  walk_model_with_cursor({
    fn(extra) {
      return store.prisma.play_history.findMany({
        where: {},
        ...extra,
      });
    },
    async handler(data, index) {
      const { id, episode_id, season_id, thumbnail, file_id } = data;

      const payload: ModelParam<typeof store.prisma.play_history.update>["data"] = {
        season_id: await (async () => {
          if (!season_id && episode_id) {
            const episode = await store.prisma.episode.findFirst({
              where: {
                id: episode_id,
              },
            });
            if (episode) {
              return episode.season_id;
            }
          }
          return undefined;
        })(),
        thumbnail: await (async () => {
          if (!thumbnail && file_id) {
            const file = await store.prisma.file.findFirst({
              where: {
                file_id,
              },
            });
            if (file) {
              const drive_res = await Drive.Get({ id: file.drive_id, store });
              if (drive_res.error) {
                return undefined;
              }
              const drive = drive_res.data;
              const r = await drive.client.fetch_file(file_id);
              if (r.error) {
                return;
              }
              return r.data.thumbnail;
            }
          }
          return undefined;
        })(),
      };
      if (Object.values(payload).filter(Boolean).length === 0) {
        return;
      }
      await store.prisma.play_history.update({
        where: {
          id,
        },
        data: payload,
      });
    },
  });
}

run();
