import { ExtraUserAndDriveInfo } from "@/domains/walker/utils";
import { DatabaseStore } from "@/domains/store";
import { FileRecord } from "@/domains/store/types";
import { FileType } from "@/constants";
import { Result } from "@/types";

/**
 * 在遍历文件夹的过程中，根据给定的目标文件/文件夹，和当前遍历到的文件夹/文件进行对比，判断是否要跳过
 */
export function need_skip_the_file_when_walk(options: {
  /** 判断是否要处理的文件 */
  target_file_name: string;
  target_file_type: string;
  /** 当前遍历到的文件 */
  cur_file: { type: string; name: string; parent_paths: string };
}) {
  const { target_file_name, target_file_type, cur_file } = options;
  const { type: cur_type, name, parent_paths: cur_file_parent_paths } = cur_file;
  if (target_file_type === "folder") {
    // 如果希望只处理指定文件夹，比如 a/b
    if (cur_type === "file") {
      // 遍历到 a/b/c/d/e.mp4 时，parent_paths = a/b/c/d 符合
      // 遍历到 a/f/g.mp4 时，parent_paths = a/f 不符合
      // 遍历到 a/f.mp4 时，parent_paths = a，不符合
      if (cur_file_parent_paths.startsWith(target_file_name)) {
        return false;
      }
    }
    if (cur_type === "folder") {
      // cur_file.name = d; cur_file.parent_paths = a/b/c
      // cur_file.name = c; cur_file.parent_paths = a/b
      // cur_file.name = b; cur_file.parent_paths = a
      // cur_file.name = a; cur_file.parent_paths = null
      const cur_filepath = [cur_file_parent_paths, name, ""].join("/");
      if (cur_filepath.startsWith(target_file_name)) {
        return false;
      }
      // console.log(target_file_name, target_file_name.startsWith(cur_filepath));
      if (target_file_name.startsWith(cur_filepath)) {
        return false;
      }
    }
  }
  if (target_file_type === "file") {
    // 如果只希望处理指定文件，比如 a/b/c/d/e.mp4
    if (cur_type === "file") {
      // 当前遍历到文件 a/b/c/e.mp4
      if (`${cur_file_parent_paths}/${name}` === target_file_name) {
        return false;
      }
    }
    if (cur_type === "folder") {
      // cur_file.name = d; cur_file.parent_paths = a/b/c
      // cur_file.name = c; cur_file.parent_paths = a/b
      // cur_file.name = b; cur_file.parent_paths = a
      // cur_file.name = a; cur_file.parent_paths = null
      if (target_file_name.startsWith(`${cur_file_parent_paths}/${name}`)) {
        return false;
      }
      if (`${cur_file_parent_paths}/${name}`.startsWith(target_file_name)) {
        return false;
      }
    }
  }
  return true;
}
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
  // if (type === "file" && !is_video_file(name)) {
  //   return Result.Err("不是合法的视频文件");
  // }
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

export function get_diff_of_file(file: { size?: number; md5?: string }, record: FileRecord) {
  const diff: Partial<FileRecord> = {};
  if (file.size && file.size !== record.size) {
    diff.size = file.size;
  }
  if (file.md5 && file.md5 !== record.md5) {
    diff.md5 = file.md5;
  }
  if (Object.keys(diff).length === 0) {
    return null;
  }
  return diff;
}
