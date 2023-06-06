import { TVProfileItemInTMDB } from "@/domains/tmdb/services";

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
