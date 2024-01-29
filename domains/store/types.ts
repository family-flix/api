import {
  async_task,
  bind_for_parsed_tv,
  drive,
  drive_token,
  episode,
  episode_profile,
  file,
  media,
  media_profile,
  media_series_profile,
  media_source,
  media_source_profile,
  movie,
  movie_profile,
  parsed_episode,
  parsed_media,
  parsed_media_source,
  parsed_movie,
  parsed_season,
  parsed_tv,
  person_in_media,
  person_profile,
  PrismaClient,
  report,
  resource_sync_task,
  season,
  season_profile,
  shared_file_in_progress,
  subtitle_v2,
  tv,
  tv_profile,
} from "@prisma/client";

export type DriveRecord = drive;
export type DriveTokenRecord = drive_token;
export type FileRecord = file;

export type ParsedMediaRecord = parsed_media;
export type ParsedMediaSourceRecord = parsed_media_source;
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
export type MediaRecord = media;
export type MediaSourceRecord = media_source;
export type MovieProfileRecord = movie_profile;
export type PersonProfileRecord = person_profile;
export type PersonRecord = person_in_media;
export type MediaProfileRecord = media_profile;
export type MediaSeriesProfileRecord = media_series_profile;
export type SubtitleRecord = subtitle_v2;
export type MediaSourceProfileRecord = media_source_profile;

export type ReportRecord = report;
export type AsyncTaskRecord = async_task;
export type SyncTaskRecord = bind_for_parsed_tv;
export type ResourceSyncTaskRecord = resource_sync_task;
export type SharedFilesInProgressRecord = shared_file_in_progress;
export type RecordCommonPart = {
  id: string;
};

export type Statistics = {
  drive_count: number;
  drive_total_size_count: number;
  drive_used_size_count: number;
  movie_count: number;
  season_count: number;
  episode_count: number;
  sync_task_count: number;
  report_count: number;
  media_request_count: number;
  invalid_season_count: number;
  invalid_movie_count: number;
  invalid_sync_task_count: number;
  unknown_media_count: number;
  updated_at: string | null;
};

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

export type ModelParam<F extends (...args: any[]) => any> = NonNullable<Parameters<F>[number]>;
export type ModelQuery<T extends ModelKeys> = NonNullable<Parameters<PrismaClient[T]["findMany"]>[0]>["where"];
export type ModelUpdateInput<T extends ModelKeys> = NonNullable<Parameters<PrismaClient[T]["update"]>[0]>["data"];
export type DriveWhereInput = NonNullable<ModelQuery<"drive">>;
export type DriveUpdateInput = NonNullable<ModelUpdateInput<"drive">>;
export type TVProfileWhereInput = NonNullable<ModelQuery<"tv_profile">>;
export type MediaProfileWhereInput = NonNullable<ModelQuery<"media_profile">>;
export type SeasonProfileWhereInput = NonNullable<ModelQuery<"season_profile">>;
export type EpisodeProfileWhereInput = NonNullable<ModelQuery<"episode_profile">>;
export type MemberNotifyWhereInput = NonNullable<ModelQuery<"member_notification">>;
export type MovieProfileWhereInput = NonNullable<ModelQuery<"movie_profile">>;
export type MemberWhereInput = NonNullable<ModelQuery<"member">>;
