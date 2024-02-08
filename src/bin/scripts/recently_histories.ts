/**
 * 获取最近更新，用户观看过的电视剧
 */
import dayjs from "dayjs";

import { Application } from "@/domains/application";
import { MediaTypes } from "@/constants";
import { ModelQuery } from "@/domains/store/types";

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
  const member = {
    id: "2thR5Xhl2pMQHOs",
  };
  const page_size = 10;
  const next_marker = "";
  const where: ModelQuery<"play_history_v2"> = {
    media: {
      type: MediaTypes.Season,
    },
    member_id: member.id,
  };
  const count = await store.prisma.play_history_v2.count({
    where,
  });
  async function fetch(next_marker: string): Promise<{ list: {}[] }> {
    const result = await store.list_with_cursor({
      fetch: (args) => {
        return store.prisma.play_history_v2.findMany({
          where,
          include: {
            media: {
              include: {
                profile: true,
                media_sources: {
                  take: 1,
                  orderBy: {
                    created: "desc",
                  },
                },
              },
            },
            media_source: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: {
            updated: "desc",
          },
          ...args,
        });
      },
      page_size,
      next_marker,
    });
    console.log(result.list.length);
    const list = result.list
      .map((history) => {
        const { id, media, media_source, current_time, duration, updated, thumbnail_path } = history;
        const { name, original_name, poster_path, air_date, source_count } = media.profile;
        const latest_episode = media.media_sources[0];
        const has_update = latest_episode && dayjs(latest_episode.created).isAfter(updated);
        return {
          id,
          type: media.type,
          media_id: media.id,
          name: name || original_name,
          poster_path: poster_path,
          cur_episode_number: media_source.profile.order,
          episode_count: source_count,
          current_time,
          duration,
          thumbnail_path,
          has_update,
          air_date,
          updated,
        };
      })
      .filter((history) => {
        return history.has_update;
      });
    const data = {
      list,
      total: count,
      page_size,
      next_marker: result.next_marker,
    };
    if (list.length === 0 && result.next_marker) {
      return fetch(result.next_marker);
    }
    return data;
  }
  const data = await fetch(next_marker);
  console.log(data);
  // const sql = `SELECT h.*
  // FROM play_history_v2 h
  // JOIN media m ON h.media_id = m.id
  // JOIN (
  //     SELECT ms1.media_id, MAX(ms1.air_date) AS max_air_date
  //     FROM media_source ms1
  //     JOIN (
  //         SELECT media_id, MAX(id) AS latest_source_id
  //         FROM media_source
  //         GROUP BY media_id
  //     ) ms2
  //     ON ms1.id = ms2.latest_source_id
  //     JOIN media_source_profile msp ON ms1.source_profile_id = msp.id
  //     GROUP BY ms1.media_id
  // ) latest_sources ON m.id = latest_sources.media_id
  // WHERE h.updated < latest_sources.max_air_date;`;
  console.log("Success");
}

main();
