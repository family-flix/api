import { ParsedMovieRecord } from "@/domains/store/types";
import { SearchedMovie } from "@/domains/walker";
import { ParsedEpisodeRecord, ParsedSeasonRecord, ParsedTVRecord } from "@/domains/store/types";
import { SearchedEpisode } from "@/domains/walker";

/**
 * 判断两个 tv 信息是否有改变（名称有改变）
 * @param existing_tv
 * @param next_res
 * @returns
 */
export function is_tv_changed(existing_tv: ParsedTVRecord, next_res: SearchedEpisode) {
  const { tv: next_tv } = next_res;
  const payload: Partial<{
    name: string;
    original_name: string;
  }> = {};
  // log("判断视频文件所属的电视剧信息是否一致", [tv.name, tv.original_name, next_tv.name, next_tv.original_name]);
  const name = next_tv.name ?? null;
  const original_name = next_tv.original_name ?? null;
  if (existing_tv.name === null) {
    if (name !== null) {
      payload.name = name;
    }
  }
  if (existing_tv.original_name === null) {
    if (original_name !== null) {
      payload.original_name = original_name;
    }
  }
  if (name !== null && existing_tv.name !== name) {
    payload.name = name;
  }
  if (original_name !== null && existing_tv.original_name !== original_name) {
    payload.original_name = original_name;
  }
  // console.log("看看电视剧信息有没有变", payload, existing_tv, next_tv);
  return payload;
}

export function is_season_changed(existing_season: ParsedSeasonRecord, parsed: SearchedEpisode) {
  const payload: Partial<{
    season_number: string;
  }> = {};
  const { season } = parsed;
  if (season.season_text !== null && existing_season.season_number !== season.season_text) {
    payload.season_number = season.season_text;
  }

  return payload;
}

/**
 * 影片文件是否发生改变
 * @param existing_episode
 * @param parsed
 * @returns
 */
export function is_episode_changed(existing_episode: ParsedEpisodeRecord, parsed: SearchedEpisode) {
  const { episode } = parsed;
  const { parent_file_id, episode_number, file_name, parent_paths, season_number } = existing_episode;
  return !(
    season_number === episode.season_text &&
    parent_file_id === episode.parent_file_id &&
    parent_paths === episode.parent_paths &&
    episode_number === episode.episode_text &&
    file_name === episode.file_name
  );
}

/**
 * 判断两个电影信息是否有改变（名称有改变）
 * @param existing_movie
 * @param next_res
 * @returns
 */
export function is_movie_changed(existing_movie: ParsedMovieRecord, next_res: SearchedMovie) {
  // const { tv: next_tv } = next_res;
  const payload: Partial<{
    name: string;
    original_name: string;
  }> = {};
  // log("判断视频文件所属的电视剧信息是否一致", [tv.name, tv.original_name, next_tv.name, next_tv.original_name]);
  const name = next_res.name ?? null;
  const original_name = next_res.original_name ?? null;
  if (existing_movie.name === null) {
    if (name !== null) {
      payload.name = name;
    }
  }
  if (existing_movie.original_name === null) {
    if (original_name !== null) {
      payload.original_name = original_name;
    }
  }
  if (name !== null && existing_movie.name !== name) {
    payload.name = name;
  }
  if (original_name !== null && existing_movie.original_name !== original_name) {
    payload.original_name = original_name;
  }
  return payload;
}
