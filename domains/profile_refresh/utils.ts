import { TVProfileRecord, SeasonProfileRecord } from "@/domains/store/types";
import { PartialSeasonFromTMDB, TVProfileFromTMDB } from "@/domains/tmdb/services";

export function check_tv_profile_need_refresh(
  existing_profile: TVProfileRecord,
  cur: Pick<
    TVProfileFromTMDB,
    "name" | "overview" | "poster_path" | "backdrop_path" | "popularity" | "number_of_seasons" | "number_of_episodes"
  >
) {
  const { name, overview, poster_path, backdrop_path, popularity, number_of_episodes, number_of_seasons } = cur;
  const body: Partial<{
    name: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    season_count: number;
    episode_count: number;
    popularity: number;
  }> = {};
  if (number_of_episodes !== null && number_of_episodes !== existing_profile.episode_count) {
    body.episode_count = number_of_episodes;
  }
  if (number_of_seasons !== null && number_of_seasons !== existing_profile.season_count) {
    body.season_count = number_of_seasons;
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
  if (Object.keys(body).length === 0) {
    return null;
  }
  return body;
}

export function check_season_profile_need_refresh(
  existing_profile: SeasonProfileRecord,
  latest_profile: Omit<PartialSeasonFromTMDB, "id" | "poster_path"> & { poster_path: string | null }
) {
  const { name, overview, poster_path, episode_count, air_date } = latest_profile;
  const body: Partial<{
    name: string;
    overview: string;
    poster_path: string;
    air_date: string;
    episode_count: number;
  }> = {};
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
