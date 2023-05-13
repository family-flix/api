import { Drive, Episode, SharedFileInProgress, TV } from "@prisma/client";

export type AliyunDriveRecord = Drive;

export type TVRecord = TV;
export type EpisodeRecord = Episode;
export type SharedFilesInProgressRecord = SharedFileInProgress;
export type RecordCommonPart = {
  id: string;
};
