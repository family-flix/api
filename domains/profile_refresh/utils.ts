import { TVProfileRecord, SeasonProfileRecord, MovieProfileRecord, EpisodeProfileRecord } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher";
import { Unpacked } from "@/types";

export function check_tv_profile_need_refresh(
  existing_profile: TVProfileRecord,
  cur: Unpacked<ReturnType<MediaSearcher["normalize_tv_profile"]>>
) {
  const { tmdb_id, name, overview, poster_path, backdrop_path, popularity, episode_count, season_count } = cur;
  const body: Partial<{
    tmdb_id: number;
    name: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    season_count: number;
    episode_count: number;
    popularity: number;
    genres: string;
    origin_country: string;
  }> = {};
  if (tmdb_id !== existing_profile.tmdb_id) {
    body.tmdb_id = tmdb_id;
  }
  if (episode_count !== null && episode_count !== existing_profile.episode_count) {
    body.episode_count = episode_count;
  }
  if (season_count !== null && season_count !== existing_profile.season_count) {
    body.season_count = season_count;
  }
  if (popularity !== null && popularity !== existing_profile.popularity) {
    body.popularity = popularity;
  }
  if (!!name && name !== existing_profile.name) {
    body.name = name;
  }
  if (!!overview && overview !== existing_profile.overview) {
    body.overview = overview;
  }
  if (!!poster_path && poster_path !== existing_profile.poster_path) {
    body.poster_path = poster_path;
  }
  if (!!backdrop_path && backdrop_path !== existing_profile.backdrop_path) {
    body.backdrop_path = backdrop_path;
  }
  if (cur.genres && cur.genres !== existing_profile.genres) {
    body.genres = cur.genres;
  }
  if (cur.origin_country && cur.origin_country !== existing_profile.origin_country) {
    body.origin_country = cur.origin_country;
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
  const { tmdb_id, name, overview, poster_path, episode_count, air_date } = cur;
  const body: Partial<{
    tmdb_id: number;
    name: string;
    overview: string;
    poster_path: string;
    air_date: string;
    episode_count: number;
  }> = {};
  if (tmdb_id !== existing_profile.tmdb_id) {
    body.tmdb_id = tmdb_id;
  }
  if (!!name && name !== existing_profile.name) {
    body.name = name;
  }
  if (episode_count !== null && episode_count !== undefined && episode_count !== existing_profile.episode_count) {
    body.episode_count = episode_count;
  }
  if (!!overview && overview !== existing_profile.overview) {
    body.overview = overview;
  }
  if (!!poster_path && poster_path !== existing_profile.poster_path) {
    body.poster_path = poster_path;
  }
  if (!!air_date && air_date !== existing_profile.air_date) {
    body.air_date = air_date;
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
  const { name, overview, poster_path, backdrop_path, popularity } = cur;
  const body: Partial<{
    tmdb_id: number;
    name: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    season_count: number;
    episode_count: number;
    popularity: number;
    genres: string;
    origin_country: string;
  }> = {};
  if (cur.tmdb_id && cur.tmdb_id !== existing_profile.tmdb_id) {
    body.tmdb_id = cur.tmdb_id;
  }
  if (popularity !== null && popularity !== existing_profile.popularity) {
    body.popularity = popularity;
  }
  if (name !== null && name !== existing_profile.name) {
    body.name = name;
  }
  if (overview !== null && overview !== existing_profile.overview) {
    body.overview = overview;
  }
  if (poster_path !== null && poster_path !== existing_profile.poster_path) {
    body.poster_path = poster_path;
  }
  if (backdrop_path !== null && backdrop_path !== existing_profile.backdrop_path) {
    body.backdrop_path = backdrop_path;
  }
  if (cur.genres && cur.genres !== existing_profile.genres) {
    body.genres = cur.genres;
  }
  if (cur.origin_country && cur.origin_country !== existing_profile.origin_country) {
    body.origin_country = cur.origin_country;
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
  const body: Partial<{
    tmdb_id: number;
    name: string;
    overview: string;
    air_date: string;
  }> = {};
  if (cur.tmdb_id && cur.tmdb_id !== existing_profile.tmdb_id) {
    body.tmdb_id = cur.tmdb_id;
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
  if (Object.keys(body).length === 0) {
    return null;
  }
  return body;
}
