/**
 * @file 遍历 searched_tv 表进行操作
 */
require("dotenv").config();
import { RecordCommonPart, TVProfileRecord } from "@/store/types";
import { store } from "@/store";

import { walk_table_with_pagination } from "@/domains/walker/utils";
import { qiniu_upload_online_file } from "@/utils/back_end";
import { TMDBClient } from "@/domains/tmdb";
import { walk_records } from "@/domains/store/utils";

const client = new TMDBClient({ token: process.env.TMDB_TOKEN });

async function run() {
  walk_records(store.prisma.tv_profile, {}, async (searched_tv) => {
    const { id, name, original_name, first_air_date, popularity, tmdb_id, poster_path, backdrop_path } = searched_tv;
    console.log("process", name || original_name);
    if (!tmdb_id) {
      return;
    }
    if (poster_path && (poster_path.includes("tmdb.org") || poster_path.includes("imgcook"))) {
      const r = await qiniu_upload_online_file(poster_path, `/poster/${tmdb_id}`);
      if (r.data?.url) {
        const { url } = r.data;
        console.log("1. upload poster_path", url);
        await store.update_tv_profile(id, {
          poster_path: url,
        });
      }
    }
    if (backdrop_path && (backdrop_path.includes("themoviedb.org") || backdrop_path.includes("imgcook"))) {
      const r = await qiniu_upload_online_file(backdrop_path, `/backdrop/${tmdb_id}`);
      if (r.data?.url) {
        const { url } = r.data;
        console.log("2. upload backdrop_path", url);
        await store.update_tv_profile(id, {
          backdrop_path: url,
        });
      }
    }

    const tmdb_profile_res = await client.fetch_tv_profile(tmdb_id);
    if (tmdb_profile_res.error) {
      return;
    }
    const profile = tmdb_profile_res.data;
    if (first_air_date === "null" || first_air_date === "") {
      await store.update_tv_profile(id, {
        first_air_date: profile.first_air_date,
      });
    }
    if (popularity === 0) {
      await store.update_tv_profile(id, {
        popularity: profile.popularity,
      });
    }
    const tmdb_seasons = profile.seasons;
    for (let i = 0; i < tmdb_seasons.length; i += 1) {
      const tmdb_season = tmdb_seasons[i];
      const { air_date, episode_count, id: season_id, name, overview, poster_path, season_number } = tmdb_season;
      const existing_res = await store.find_season_profile({
        tmdb_id: season_id,
      });
      if (existing_res.error) {
        continue;
      }
      if (existing_res.data) {
        continue;
      }
      console.log("3. add searched_season", season_number);
      // await store.add_season_profile({
      //   air_date,
      //   episode_count,
      //   tmdb_id: season_id,
      //   // tmdb_tv_id: tmdb_id,
      //   name,
      //   overview,
      //   poster_path,
      //   season_number,
      //   tv_profile_id: id,
      // });
    }
  });
  console.log("Complete");
}

run();
