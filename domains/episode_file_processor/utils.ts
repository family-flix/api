import { ParsedEpisodeRecord, ParsedSeasonRecord, ParsedTVRecord } from "@/store/types";
import { SearchedEpisode } from "@/domains/walker";

/**
 * 判断两个 tv 信息是否有改变（名称有改变）
 * @param existing_tv
 * @param next_tv
 * @returns
 */
export function is_tv_changed(existing_tv: ParsedTVRecord, parsed: SearchedEpisode) {
  const { tv } = parsed;
  // log("判断视频文件所属的电视剧信息是否一致", [tv.name, tv.original_name, next_tv.name, next_tv.original_name]);
  const name = tv.name || null;
  const original_name = tv.original_name || null;
  if (existing_tv === null) {
    return false;
  }
  if (existing_tv.name === null) {
    if (name !== null) {
      return true;
    }
  }
  if (existing_tv.original_name === null) {
    if (original_name !== null) {
      return true;
    }
  }
  if (existing_tv.name !== name) {
    return true;
  }
  if (existing_tv.original_name !== original_name) {
    return true;
  }
  return false;
}

export function is_season_changed(existing_season: ParsedSeasonRecord, parsed: SearchedEpisode) {
  const { season } = parsed;
  if (existing_season.season_number !== season.season) {
    return true;
  }
  return false;
}

/**
 * 影片文件是否发生改变
 * @param existing_episode
 * @param parsed
 * @returns
 */
export function is_episode_changed(existing_episode: ParsedEpisodeRecord, parsed: SearchedEpisode) {
  const { episode } = parsed;
  const { parent_file_id, episode_number, file_name, size, parent_paths, season_number } = existing_episode;
  return !(
    season_number === parsed.season.season &&
    parent_file_id &&
    parent_file_id === episode.parent_file_id &&
    parent_paths === episode.parent_paths &&
    episode_number === episode.episode &&
    file_name === episode.file_name
  );
}
