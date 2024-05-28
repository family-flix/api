/**
 * @file 本地数据库 client
 */
import { DriveClient } from "@/domains/clients/types";
import { DataStore } from "@/domains/store/types";
import { build_drive_file } from "@/domains/clients/utils";
import { FileType } from "@/constants";
import { Result, resultify } from "@/types";

export class DatabaseDriveClient implements DriveClient {
  id: string = "";
  unique_id: string;
  token: string = "";
  root_folder = null;

  store: DataStore;

  constructor(props: { drive_id: string; store: DataStore }) {
    const { drive_id, store } = props;

    this.unique_id = drive_id;
    this.store = store;
  }
  async fetch_files(id: string, options: { marker?: string } = {}) {
    const { marker } = options;
    const store = this.store;
    const drive_id = this.unique_id;
    const page_size = 20;
    const r = await resultify(store.prisma.file.findMany.bind(store.prisma.file))({
      where: {
        parent_file_id: id,
        drive_id: drive_id,
        name: marker === "" ? undefined : { lte: marker },
      },
      orderBy: {
        name: "desc",
      },
      take: page_size + 1,
    });
    if (r.error) {
      return r;
    }
    const rows = r.data.map((f) => {
      const { file_id, parent_file_id, name, type } = f;
      return {
        file_id,
        parent_file_id,
        name,
        type: type === FileType.File ? "file" : "folder",
      };
    });
    const has_next_page = rows.length === page_size + 1 && rows[page_size];
    const next_marker = has_next_page ? rows[page_size].name : "";
    const result = {
      items: rows.slice(0, page_size).map((file) => {
        const { file_id, name, type, parent_file_id } = file;
        const data = build_drive_file({
          file_id,
          name,
          type,
          parent_file_id,
        });
        return data;
      }),
      next_marker,
    };
    return Result.Ok(result);
  }
  async fetch_file(id: string) {
    const file = await this.store.prisma.file.findFirst({
      where: {
        file_id: id,
        drive_id: this.unique_id,
      },
    });
    if (!file) {
      return Result.Err("No matched record");
    }
    const { file_id, name, parent_file_id } = file;
    const data = build_drive_file({
      file_id,
      name,
      parent_file_id,
      type: file.type === 1 ? "file" : "folder",
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
  async fetch_video_preview_info_for_download() {
    return Result.Err("请实现 fetch_video_preview_info_for_download 方法");
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
  async generate_thumbnail() {
    return Result.Err("请实现 generate_thumbnail 方法");
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
  on_print() {
    return () => {};
  }
}
