import { TVProfileItemInTMDB } from "@/domains/tmdb/services";
import { Result } from "@/types";
import { qiniu_upload_online_file } from "@/utils/back_end";

export function extra_searched_tv_field(tv: TVProfileItemInTMDB) {
  const {
    id: tmdb_id,
    name,
    original_name,
    backdrop_path,
    original_language,
    overview,
    popularity,
    poster_path,
    first_air_date,
    vote_average,
    vote_count,
    // number_of_episodes,
    // number_of_seasons,
  } = tv;
  return {
    tmdb_id,
    name,
    original_name,
    backdrop_path,
    original_language,
    overview,
    popularity,
    poster_path,
    first_air_date,
    vote_average,
    vote_count,
  };
}

/**
 * 上传 tmdb 图片到七牛云
 * @param tmdb
 * @returns
 */
export async function upload_tmdb_images(tmdb: { tmdb_id: number; poster_path?: string; backdrop_path?: string }) {
  const { tmdb_id, poster_path, backdrop_path } = tmdb;
  // log("[]upload_tmdb_images", tmdb_id, poster_path, backdrop_path);
  const result = {
    poster_path,
    backdrop_path,
  };
  if (poster_path && poster_path.includes("tmdb.org")) {
    const r = await qiniu_upload_online_file(poster_path, `/poster/${tmdb_id}`);
    if (r.error) {
      //       log("[]upload poster failed", r.error.message);
    }
    if (r.data) {
      const { url } = r.data;
      result.poster_path = url;
    }
  }
  if (backdrop_path && backdrop_path.includes("themoviedb.org")) {
    const r = await qiniu_upload_online_file(backdrop_path, `/backdrop/${tmdb_id}`);
    if (r.error) {
      //       log("[]upload backdrop failed", r.error.message);
    }
    if (r.data) {
      const { url } = r.data;
      result.backdrop_path = url;
    }
  }
  return result;
}
