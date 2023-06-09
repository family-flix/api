import {
  async_task,
  bind_for_parsed_tv,
  drive,
  episode,
  file,
  parsed_episode,
  parsed_season,
  parsed_tv,
  PrismaClient,
  shared_file_in_progress,
  tv,
  tv_profile,
} from "@prisma/client";

export type DriveRecord = drive;
export type FilesRecord = file;
export type ParsedTVRecord = parsed_tv;
export type AsyncTaskRecord = async_task;
export type ParsedSeasonRecord = parsed_season;
export type ParsedEpisodeRecord = parsed_episode;
export type TVProfileRecord = tv_profile;
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
