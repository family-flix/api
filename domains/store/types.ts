import {
  async_task,
  bind_for_parsed_tv,
  drive,
  episode,
  episode_profile,
  file,
  movie,
  movie_profile,
  parsed_episode,
  parsed_movie,
  parsed_season,
  parsed_tv,
  PrismaClient,
  report,
  season,
  season_profile,
  shared_file_in_progress,
  tv,
  tv_profile,
} from "@prisma/client";

export type DriveRecord = drive;
export type FileRecord = file;

export type ParsedTVRecord = parsed_tv;
export type ParsedSeasonRecord = parsed_season;
export type ParsedEpisodeRecord = parsed_episode;
export type ParsedMovieRecord = parsed_movie;

export type TVRecord = tv;
export type TVProfileRecord = tv_profile;
export type SeasonRecord = season;
export type SeasonProfileRecord = season_profile;
export type EpisodeRecord = episode;
export type EpisodeProfileRecord = episode_profile;
export type MovieRecord = movie;
export type MovieProfileRecord = movie_profile;

export type ReportRecord = report;
export type AsyncTaskRecord = async_task;
export type TVBindTaskRecord = bind_for_parsed_tv;
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

export type ModelQuery<F extends (...args: any[]) => any> = NonNullable<Parameters<F>[number]>;
export type ModelWhereInput<T extends ModelKeys> = NonNullable<Parameters<PrismaClient[T]["findMany"]>[0]>["where"];
export type TVProfileWhereInput = NonNullable<ModelWhereInput<"tv_profile">>;
export type MemberNotifyWhereInput = NonNullable<ModelWhereInput<"member_notification">>;
export type MovieProfileWhereInput = NonNullable<ModelWhereInput<"movie_profile">>;
export type MemberWhereInput = NonNullable<ModelWhereInput<"member">>;
