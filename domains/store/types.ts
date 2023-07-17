import {
  async_task,
  bind_for_parsed_tv,
  drive,
  episode,
  episode_profile,
  file,
  movie_profile,
  parsed_episode,
  parsed_movie,
  parsed_season,
  parsed_tv,
  PrismaClient,
  shared_file_in_progress,
  tv,
  tv_profile,
} from "@prisma/client";

export type DriveRecord = drive;
export type FileRecord = file;
export type ParsedTVRecord = parsed_tv;
export type ParsedMovieRecord = parsed_movie;
export type AsyncTaskRecord = async_task;
export type ParsedSeasonRecord = parsed_season;
export type ParsedEpisodeRecord = parsed_episode;
export type TVProfileRecord = tv_profile;
export type TVRecord = tv;
export type EpisodeRecord = episode;
export type EpisodeProfileRecord = episode_profile;
export type TVBindTaskRecord = bind_for_parsed_tv;
export type MovieProfileRecord = movie_profile;
export type SharedFilesInProgressRecord = shared_file_in_progress;
export type RecordCommonPart = {
  id: string;
};
export type FileSyncTaskRecord = bind_for_parsed_tv;

export type ModelKeys = keyof Omit<
  PrismaClient,
  | "$on"
  | "$connect"
  | "$disconnect"
  | "$use"
  | "$executeRaw"
  | "$executeRawUnsafe"
  | "$queryRaw"
  | "$queryRawUnsafe"
  | "$transaction"
>;
