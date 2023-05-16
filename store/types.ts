import {
  async_task,
  drive,
  episode,
  file,
  maybe_tv,
  PrismaClient,
  searched_tv,
  shared_file_in_progress,
  tv,
} from "@prisma/client";

export type AliyunDriveRecord = drive;

export type FilesRecord = file;
export type MaybeTVRecord = maybe_tv;
export type AsyncTaskRecord = async_task;
export type EpisodeRecord = episode;
export type SearchedTVRecord = searched_tv;
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
