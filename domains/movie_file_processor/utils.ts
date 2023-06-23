import { ParsedEpisodeRecord, ParsedMovieRecord, ParsedSeasonRecord, ParsedTVRecord } from "@/store/types";
import { SearchedEpisode, SearchedMovie } from "@/domains/walker";

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
