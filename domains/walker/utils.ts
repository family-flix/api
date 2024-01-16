import { PartialAliyunDriveFile } from "@/domains/aliyundrive/types";
import { SearchedEpisode } from "@/domains/walker";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { DatabaseStore } from "@/domains/store";
import { ParsedTVRecord, ParsedEpisodeRecord, RecordCommonPart, ParsedSeasonRecord } from "@/domains/store/types";
import { is_video_file } from "@/utils";
import { Result, resultify } from "@/types";
import { FileType } from "@/constants";

export type EventHandlers = Partial<{
  on_tv: (tv: ParsedTVRecord & RecordCommonPart) => void;
  on_stop: () => Result<boolean>;
  on_error: (error_msg: string[]) => void;
}>;
export type ExtraUserAndDriveInfo = {
  user_id: string;
  drive_id: string;
  async_task_id?: string;
};

/**
 * 遍历云盘时保存遍历到的视频文件夹/文件
 * @param file
 * @param extra
 * @returns
 */
export async function adding_file_safely(
  file: {
    file_id: string;
    name: string;
    parent_file_id: string;
    parent_paths: string;
    type: "folder" | "file";
    size?: number;
  },
  extra: ExtraUserAndDriveInfo,
  store: DatabaseStore
) {
  const { file_id, name, parent_file_id, parent_paths, type, size = 0 } = file;
  const { drive_id, user_id } = extra;
  if (type === "file" && !is_video_file(name)) {
    return Result.Err("不是合法的视频文件");
  }
  const existing_folder_res = await store.find_file({ file_id });
  if (existing_folder_res.error) {
    return Result.Err(existing_folder_res.error);
  }
  if (existing_folder_res.data) {
    return Result.Ok({ id: existing_folder_res.data.id });
  }
  const adding_res = await store.add_file({
    file_id,
    name,
    parent_file_id,
    parent_paths,
    type: (() => {
      if (type === "file") {
        return FileType.File;
      }
      if (type === "folder") {
        return FileType.Folder;
      }
      return FileType.Unknown;
    })(),
    size,
    drive_id,
    user_id,
  });
  if (adding_res.error) {
    return Result.Err(adding_res.error);
  }
  return Result.Ok({ id: adding_res.data.id });
}

/**
 * 修改指定影片所属的 tv
 */
export async function change_episode_tv_id(
  new_tv: { id: string },
  episode: { id: string; tv_id: string },
  store: DatabaseStore
) {
  const episode_updated: { id: string; body: Record<string, string> } = {
    id: episode.id,
    body: {
      tv_id: new_tv.id,
    },
  };
  if (Object.keys(episode_updated.body).length !== 0) {
    // log(`[]update episode ${episode_updated.id} with`, episode_updated.body);
    const update_episode_resp = await store.update_episode(episode_updated.id, episode_updated.body);
    if (update_episode_resp.error) {
      return update_episode_resp;
    }
  }
  return Result.Ok(null);
}

type FolderTree = {
  file_id: string;
  name: string;
  type: "file" | "folder";
  items?: FolderTree[];
};
/**
 * @deprecated
 * @param records
 * @returns
 */
export function build_folder_tree(records: ParsedEpisodeRecord[]) {
  function log(...args: unknown[]) {}

  let tree: FolderTree[] = [];
  let temp_tree = tree;

  for (let i = 0; i < records.length; i += 1) {
    const episode = records[i];
    // @ts-ignore
    const { file_id, file_name, parent_paths } = episode;
    const segments = parent_paths.split("/").concat(file_name);
    for (let j = 0; j < segments.length; j += 1) {
      const path = segments[j];
      const is_last = j === segments.length - 1;
      // log("\n");
      // log("start", path, j);
      if (temp_tree.length === 0) {
        // log("items is empty");
        const name = path;
        const sub_folder_or_file = {
          file_id: is_last ? file_id : name,
          name: name,
          type: is_last ? "file" : "folder",
        } as FolderTree;
        if (!is_last) {
          sub_folder_or_file.items = [];
        }
        // log(
        //   `${is_last ? "is" : "not"} last one, so create ${is_last ? "file" : "sub folder"} then insert`,
        //   path,
        //   sub_folder_or_file
        // );
        temp_tree.push(sub_folder_or_file);
        if (!is_last) {
          temp_tree = sub_folder_or_file.items!;
        }
        if (is_last) {
          // log("1 need reset temp_tree");
          temp_tree = tree;
          break;
        }
        continue;
      }
      // log("not empty", temp_tree);
      const matched_folder = temp_tree.find((f) => f.file_id === path);
      if (!matched_folder) {
        const name = path;
        const sub_folder_or_file = {
          file_id: is_last ? file_id : name,
          name: name,
          type: is_last ? "file" : "folder",
        } as FolderTree;
        if (!is_last) {
          sub_folder_or_file.items = [];
        }
        // log(
        //   `${is_last ? "is" : "not"} last one, so create ${is_last ? "file" : "sub folder"} then insert`,
        //   path,
        //   temp_tree
        // );
        temp_tree.push(sub_folder_or_file);
        if (!is_last) {
          temp_tree = sub_folder_or_file.items!;
        }
        if (is_last) {
          // log("2 need reset temp_tree");
          temp_tree = tree;
          break;
        }
        continue;
      }
      // log("there has matched folder", matched_folder);
      if (matched_folder.items) {
        temp_tree = matched_folder.items;
      }
    }
  }
  return tree;
}

/** 遍历完云盘后的整个文件树 */
export type RequestedAliyunDriveFiles = PartialAliyunDriveFile & {
  items?: RequestedAliyunDriveFiles[];
};
