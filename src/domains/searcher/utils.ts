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

