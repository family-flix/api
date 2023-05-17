import {
  async_task,
  drive,
  episode,
  file,
  parsed_episode,
  parsed_tv,
  PrismaClient,
  shared_file_in_progress,
  tv,
  tv_profile,
} from "@prisma/client";

export type AliyunDriveRecord = drive;

export type FilesRecord = file;
export type ParsedTVRecord = parsed_tv;
export type TaskRecord = async_task;
export type ParsedEpisodeRecord = parsed_episode;
export type TVProfileRecord = tv_profile;
export type SharedFilesInProgressRecord = shared_file_in_progress;
export type RecordCommonPart = {
  id: string;
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
