/**
 * @file 遍历所有电视剧详情记录
 */

import { DatabaseStore } from "@/domains/store";
import { walk_records } from "@/domains/store/utils";
import { TMDBClient } from "@/domains/media_profile/tmdb";
import { FileManage } from "@/domains/uploader";
import { app, store } from "@/store";

async function walk_tv_profile(store: DatabaseStore) {
  const upload = new FileManage({
    root: app.assets,
  });
  const client = new TMDBClient({
    token: "c2e5d34999e27f8e0ef18421aa5dec38",
  });
  await walk_records(store.prisma.tv_profile, {}, async (profile) => {
    const { id, unique_id, name, original_name, poster_path, backdrop_path, created } = profile;
    const body: Partial<{
      poster_path: string;
      backdrop_path: string;
    }> = {};
    const profile_res = await client.fetch_tv_profile(Number(unique_id));
    if (profile_res.error) {
      return;
    }
    const p = profile_res.data;
    if (p.poster_path && p.poster_path.includes("http")) {
      const r = await upload.download(p.poster_path, `/poster/${unique_id}.jpg`);
      if (r.data) {
        body.poster_path = r.data;
      }
    }
    if (p.backdrop_path && p.backdrop_path.includes("http")) {
      const r = await upload.download(p.backdrop_path, `/backdrop/${unique_id}.jpg`);
      if (r.data) {
        body.backdrop_path = r.data;
      }
    }
    store.update_tv_profile(id, body);
  });
}

walk_tv_profile(store);
