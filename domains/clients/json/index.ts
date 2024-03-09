/**
 * @file 本地 mock json 数据 client
 */
import { RequestedAliyunDriveFiles } from "@/domains/walker/utils";
import { GenreDriveFile } from "@/domains/clients/types";
import { DatabaseStore } from "@/domains/store";
import { DriveClient } from "@/domains/clients/types";
import { build_drive_file } from "@/domains/clients/utils";
import { Result } from "@/types";

export class MockFileClient implements DriveClient {
  id: string = "";
  unique_id: string = "";
  token: string = "";
  root_folder = null;

  size = 10;

  tree: RequestedAliyunDriveFiles;
  store: DatabaseStore;

  constructor(props: { data: RequestedAliyunDriveFiles }) {
    const { data } = props;

    this.tree = data;
    // 这里仅仅是为了兼容 DriveClient 必须有 store，并没有实际使用
    this.store = new DatabaseStore({} as any);
  }
  fetch_files(
    /** 该文件夹下的文件列表，默认 root 表示根目录 */
    file_id: string = "root",
    options: Partial<{
      /** 每页数量 */
      page_size: number;
      /** 下一页标志 */
      marker: string;
      sort: { field: "name" | "updated_at" | "size"; order: "asc" | "desc" }[];
    }> = {}
  ) {
    const { marker, page_size: size = 20 } = options;
    // console.log("[](fake fetchFiles)", file_id, marker);
    const matched = find_child_recursive(this.tree, file_id);
    // console.log("[](fake fetchFiles)", matched);
    if (matched) {
      const { items = [] } = matched;
      const files = items.map((file) => {
        const { file_id, name, type, parent_file_id } = file;
        const data = build_drive_file({
          file_id,
          name,
          type,
          parent_file_id,
        });
        return data;
      });
      const first_items_result = {
        items: files.slice(0 * 1, (0 + 1) * size),
        next_marker: items.length > (0 + 1) * size ? "p1" : "",
      };
      if (marker) {
        const p = marker.match(/[0-9]{1,}/);
        if (p === undefined) {
          return Promise.resolve(Result.Ok(first_items_result));
        }
        const page = Number(p);
        return Promise.resolve(
          Result.Ok({
            items: files.slice(page * size, (page + 1) * size),
            next_marker: items.length > (page + 1) * size ? `p${page + 1}` : "",
          })
        );
      }
      return Promise.resolve(Result.Ok(first_items_result));
    }
    return Promise.resolve(
      Result.Ok({
        items: [] as GenreDriveFile[],
        next_marker: "",
      })
    );
  }
  async fetch_file(file_id: string) {
    const result = find_child_recursive(this.tree, file_id);
    if (result === null) {
      return Promise.resolve(Result.Err(`'${file_id}' 没有匹配的文件`));
    }
    const { name, type, parent_file_id } = result;
    const data = build_drive_file({
      file_id,
      name,
      type,
      parent_file_id,
    });
    return Result.Ok(data);
  }

  async ping() {
    return Result.Err("请实现 ping 方法");
  }
  async refresh_profile() {
    return Result.Err("请实现 refresh_profile 方法");
  }
  async search_files() {
    return Result.Err("请实现 search_files 方法");
  }
  async existing() {
    return Result.Err("请实现 existing 方法");
  }
  async rename_file() {
    return Result.Err("请实现 rename_file 方法");
  }
  async delete_file() {
    return Result.Err("请实现 delete_file 方法");
  }
  async fetch_parent_paths() {
    return Result.Err("请实现 fetch_parent_paths 方法");
  }
  async fetch_video_preview_info() {
    return Result.Err("请实现 fetch_video_preview_info 方法");
  }
  async create_folder() {
    return Result.Err("请实现 create_folder 方法");
  }
  async move_files_to_folder() {
    return Result.Err("请实现 move_files_to_folder 方法");
  }
  async download() {
    return Result.Err("请实现 download 方法");
  }
  async upload() {
    return Result.Err("请实现 upload 方法");
  }
  async fetch_content() {
    return Result.Err("请实现 upload 方法");
  }
  async fetch_share_profile() {
    return Result.Err("请实现 fetch_share_profile 方法");
  }
  async fetch_resource_files() {
    return Result.Err("请实现 fetch_shared_files 方法");
  }
  async fetch_shared_file() {
    return Result.Err("请实现 fetch_shared_file 方法");
  }
  async search_shared_files() {
    return Result.Err("请实现 search_shared_files 方法");
  }
  async save_shared_files() {
    return Result.Err("请实现 save_shared_files 方法");
  }
  async save_multiple_shared_files() {
    return Result.Err("请实现 save_multiple_shared_files 方法");
  }
  async checked_in() {
    return Result.Err("请实现 checked_in 方法");
  }
}

function find_child_recursive(file: RequestedAliyunDriveFiles, id: string): RequestedAliyunDriveFiles | null {
  const { file_id, items } = file;
  if (file_id === id) {
    return file;
  }
  if (!items) {
    return null;
  }
  for (let i = 0; i < items.length; i += 1) {
    const matched = find_child_recursive(items[i], id);
    if (matched) {
      return matched;
    }
  }
  return null;
}
