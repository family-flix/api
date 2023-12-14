import { TVProfileItemInTMDB } from "@/domains/media_profile/tmdb/services";

export function extra_searched_tv_field(tv: TVProfileItemInTMDB) {
  const {
    id: tmdb_id,
    name,
    original_name,
    backdrop_path,
    original_language,
    overview,
    poster_path,
    first_air_date,
    vote_average,
    vote_count,
  } = tv;
  return {
    tmdb_id,
    name,
    original_name,
    backdrop_path,
    original_language,
    overview,
    poster_path,
    first_air_date,
    vote_average,
    vote_count,
  };
}

/**
 * 将季的 name 字段统一
 */
export function format_season_name(body: { season_name: string; season_number: number; tv_name: string }) {
  const { season_name, season_number, tv_name } = body;
  const regexp1 = /^第 {0,1}([0-9]{1,}) {0,1}季$/;
  const regexp2 = /^第 {0,1}([一二三四五六七八九十]{1,}) {0,1}季$/;
  const regexp3 = /Season {0,1}([0-9]{1,})$/;
  const regexp4 = /特别篇|TV版/;
  if (season_name.includes(tv_name)) {
    return season_name;
  }
  // if (season_name.match(regexp1)) {
  //   return [tv_name, season_name].join(" ");
  // }
  return [tv_name, season_name].join(" ");
}
