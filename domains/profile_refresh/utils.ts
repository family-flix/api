import { TVProfileRecord, SeasonProfileRecord, MovieProfileRecord, EpisodeProfileRecord } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher";
import { Unpacked } from "@/types";

export function check_tv_profile_need_refresh(
  existing_profile: TVProfileRecord,
  cur: Unpacked<ReturnType<MediaSearcher["normalize_tv_profile"]>>
) {
  const body: Partial<typeof cur> = {};
  if (cur.unique_id !== existing_profile.unique_id) {
    body.unique_id = cur.unique_id;
  }
  if (cur.in_production !== null && cur.in_production !== existing_profile.in_production) {
    body.in_production = cur.in_production;
  }
  if (cur.episode_count !== null && cur.episode_count !== existing_profile.episode_count) {
    body.episode_count = cur.episode_count;
  }
  if (cur.season_count !== null && cur.season_count !== existing_profile.season_count) {
    body.season_count = cur.season_count;
  }
  if (cur.popularity !== null && cur.popularity !== existing_profile.popularity) {
    body.popularity = cur.popularity;
  }
  if (!!cur.name && cur.name !== existing_profile.name) {
    body.name = cur.name;
  }
  if (!!cur.overview && cur.overview !== existing_profile.overview) {
    body.overview = cur.overview;
  }
  if (!!cur.poster_path && cur.poster_path !== existing_profile.poster_path) {
    body.poster_path = cur.poster_path;
  }
  if (!!cur.backdrop_path && cur.backdrop_path !== existing_profile.backdrop_path) {
    body.backdrop_path = cur.backdrop_path;
  }
  if (cur.genres && cur.genres !== existing_profile.genres) {
    body.genres = cur.genres;
  }
  if (cur.origin_country && cur.origin_country !== existing_profile.origin_country) {
    body.origin_country = cur.origin_country;
  }
  if (cur.vote_average && cur.vote_average !== existing_profile.vote_average) {
    body.vote_average = cur.vote_average;
  }
  if (Object.keys(body).length === 0) {
    return null;
  }
  return body;
}

export function check_season_profile_need_refresh(
  existing_profile: SeasonProfileRecord,
  cur: Unpacked<ReturnType<MediaSearcher["normalize_season_profile"]>>
) {
  const body: Partial<typeof cur> = {};
  if (cur.unique_id && cur.unique_id !== existing_profile.unique_id) {
    body.unique_id = cur.unique_id;
  }
  if (cur.name && cur.name !== existing_profile.name) {
    body.name = cur.name;
  }
  if (
    cur.episode_count !== null &&
    cur.episode_count !== undefined &&
    cur.episode_count !== existing_profile.episode_count
  ) {
    body.episode_count = cur.episode_count;
  }
  if (cur.overview && cur.overview !== existing_profile.overview) {
    body.overview = cur.overview;
  }
  if (cur.poster_path && cur.poster_path !== existing_profile.poster_path) {
    body.poster_path = cur.poster_path;
  }
  if (cur.air_date && cur.air_date !== existing_profile.air_date) {
    body.air_date = cur.air_date;
  }
  if (Object.keys(body).length === 0) {
    return null;
  }
  return body;
}

export function check_movie_need_refresh(
  existing_profile: MovieProfileRecord,
  cur: Unpacked<ReturnType<MediaSearcher["normalize_movie_profile"]>>
) {
  const body: Partial<typeof cur> = {};
  if (cur.unique_id && cur.unique_id !== existing_profile.unique_id) {
    body.unique_id = cur.unique_id;
  }
  if (cur.vote_average && cur.vote_average !== existing_profile.vote_average) {
    body.vote_average = cur.vote_average;
  }
  if (cur.popularity !== null && cur.popularity !== existing_profile.popularity) {
    body.popularity = cur.popularity;
  }
  if (cur.name !== null && cur.name !== existing_profile.name) {
    body.name = cur.name;
  }
  if (cur.overview !== null && cur.overview !== existing_profile.overview) {
    body.overview = cur.overview;
  }
  if (cur.poster_path !== null && cur.poster_path !== existing_profile.poster_path) {
    body.poster_path = cur.poster_path;
  }
  if (cur.backdrop_path !== null && cur.backdrop_path !== existing_profile.backdrop_path) {
    body.backdrop_path = cur.backdrop_path;
  }
  if (cur.genres && cur.genres !== existing_profile.genres) {
    body.genres = cur.genres;
  }
  if (cur.origin_country && cur.origin_country !== existing_profile.origin_country) {
    body.origin_country = cur.origin_country;
  }
  if (cur.runtime && cur.runtime !== existing_profile.runtime) {
    body.runtime = cur.runtime;
  }
  if (Object.keys(body).length === 0) {
    return null;
  }
  return body;
}

export function check_episode_profile_need_refresh(
  existing_profile: EpisodeProfileRecord,
  cur: Unpacked<ReturnType<MediaSearcher["normalize_episode_profile"]>>
) {
  const body: Partial<typeof cur> = {};
  if (cur.unique_id && cur.unique_id !== existing_profile.unique_id) {
    body.unique_id = cur.unique_id;
  }
  if (cur.name && cur.name !== existing_profile.name) {
    body.name = cur.name;
  }
  if (cur.overview && cur.overview !== existing_profile.overview) {
    body.overview = cur.overview;
  }
  if (cur.air_date && cur.air_date !== existing_profile.air_date) {
    body.air_date = cur.air_date;
  }
  if (cur.runtime && cur.runtime !== existing_profile.runtime) {
    body.runtime = cur.runtime;
  }
  if (Object.keys(body).length === 0) {
    return null;
  }
  return body;
}
