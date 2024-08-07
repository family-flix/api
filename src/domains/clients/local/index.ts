/**
 * @file 将本机视为 云盘
 */
// import fs from "fs/promises";
import { copyFileSync, renameSync, mkdirSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";

import Joi from "joi";

import { FakeDatabaseStore } from "@/domains/store/fake";
import { User } from "@/domains/user/index";
import { DriveTypes } from "@/domains/drive/constants";
import { DataStore } from "@/domains/store/types";
import { DriveClient, GenreDriveFile } from "@/domains/clients/types";
import { build_drive_file } from "@/domains/clients/utils";
import { Result, resultify } from "@/domains/result/index";
import { check_existing, file_info, rmdir, rmfile } from "@/utils/fs";
import { r_id } from "@/utils/index";
import { FileType } from "@/constants/index";

type LocalFileDriveClientProps = {
  unique_id: string;
};
export class LocalFileDriveClient implements DriveClient {
  static async Get(options: { unique_id: string; user?: User; store?: DataStore }) {
    const { unique_id, store } = options;
    if (!store) {
      return Result.Ok(new LocalFileDriveClient({ unique_id }));
    }
    const drive = await store.prisma.drive.findFirst({
      where: {
        unique_id,
      },
    });
    if (!drive) {
      return Result.Err("没有匹配的记录");
    }
    return Result.Ok(new LocalFileDriveClient({ unique_id }));
  }
  static async Create(values: { payload: unknown; user: User; store: DataStore }) {
    const { payload, user, store } = values;
    const drive_schema = Joi.object({
      dir: Joi.string().required(),
    });
    const r = await resultify(drive_schema.validateAsync.bind(drive_schema))(payload);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { dir } = r.data as { dir: string };
    const existing_drive = await store.prisma.drive.findUnique({
      where: {
        user_id_unique_id: {
          unique_id: String(dir),
          user_id: user.id,
        },
      },
    });
    if (existing_drive) {
      return Result.Err("该云盘已存在，请检查信息后重试", undefined, { id: existing_drive.id });
    }
    const drive_record_id = r_id();
    const client = new LocalFileDriveClient({
      unique_id: dir,
    });
    const { name } = path.parse(dir);
    const created_drive = await store.prisma.drive.create({
      data: {
        id: drive_record_id,
        name,
        avatar: "",
        type: DriveTypes.LocalFolder,
        unique_id: dir,
        profile: JSON.stringify({ dir, drive_id: dir, name } as { dir: string; name: string }),
        root_folder_id: dir,
        drive_token: {
          create: {
            id: r_id(),
            data: JSON.stringify({}),
            expired_at: 0,
          },
        },
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    });
    return Result.Ok({
      record: created_drive,
      client,
    });
  }

  id = "";
  unique_id = "";
  token = "";
  root_folder: { id: string; name: string };

  $store = new FakeDatabaseStore();

  constructor(props: LocalFileDriveClientProps) {
    const { unique_id } = props;

    // this.id = id;
    this.unique_id = unique_id;

    const { name } = path.parse(unique_id);
    this.root_folder = {
      id: unique_id,
      name,
    };
  }

  async fetch_files(
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
    const filepath = (() => {
      const homedir = path.resolve(this.unique_id);
      if (!file_id || file_id === "root") {
        return homedir;
      }
      return file_id;
    })();
    const r = await readdirSync(filepath);
    const files: GenreDriveFile[] = [];
    for (let i = 0; i < r.length; i += 1) {
      const full_path = path.resolve(filepath, r[i]);
      try {
        const stats = await statSync(full_path);
        const file = build_drive_file({
          file_id: full_path,
          name: r[i],
          type: stats.isDirectory() ? "folder" : "file",
          size: stats.size,
          parent_file_id: filepath,
        });
        files.push(file);
      } catch (err) {
        // ...
      }
    }
    return Result.Ok({
      items: files,
      next_marker: "",
    });
  }
  async fetch_file(file_id: string) {
    try {
      const stats = await statSync(file_id);
      const { dir, name } = path.parse(file_id);
      const data = build_drive_file({
        file_id,
        name,
        type: stats.isDirectory() ? "folder" : "file",
        size: stats.size,
        parent_file_id: file_id === this.root_folder.id ? "" : dir,
      });
      return Result.Ok(data);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  }
  async create_folder(params: { name: string; parent_file_id?: string }) {
    const { name, parent_file_id = this.root_folder.id } = params;
    try {
      const parent_folder_id = this.get_parent_folder_id(parent_file_id);
      const file_id = path.resolve(parent_folder_id, name);
      const r = await check_existing(file_id);
      if (r.data) {
        return Result.Err("The folder has existing");
      }
      await mkdirSync(file_id);
      const folder = build_drive_file({
        type: "folder",
        file_id,
        name,
        parent_file_id: parent_folder_id,
      });
      return Result.Ok(folder);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  }
  async upload(
    filepath: string,
    options: { name: string; parent_file_id?: string; drive_id?: string; on_progress?: (v: string) => void }
  ) {
    const { name, parent_file_id } = options;
    const parent_folder_id = this.get_parent_folder_id(parent_file_id);
    try {
      const file_id = path.resolve(parent_folder_id, name);
      const r = await check_existing(file_id);
      if (r.data) {
        return Result.Err("The file has existing");
      }
      await copyFileSync(filepath, file_id);
      return Result.Ok({
        file_id,
        file_name: name,
      });
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  }
  /** 获取指定文件内容 */
  async fetch_content(file_id: string) {
    try {
      const content = readFileSync(file_id, "utf-8");
      return Result.Ok({ content });
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  }
  get_parent_folder_id(parent_file_id?: string) {
    if (!parent_file_id) {
      return this.root_folder.id;
    }
    if (parent_file_id === "root") {
      return this.root_folder.id;
    }
    return parent_file_id;
  }
  async fetch_parent_paths(file_id: string, type?: FileType) {
    const r = path.relative(this.root_folder.id, file_id);
    const paths = r.split("/").filter(Boolean);
    type Folder = {
      file_id: string;
      name: string;
      parent_file_id: string;
      type: string;
    };
    let parent: Folder = {
      file_id: this.root_folder.id,
      name: this.root_folder.name,
      parent_file_id: "root",
      type: "folder",
    };
    // let parent: Folder = {
    //   file_id: path.resolve(this.root_folder.id, paths[0]),
    //   name: paths[0],
    //   parent_file_id: this.root_folder.id,
    //   type: "folder",
    // };
    const parents: Folder[] = [parent];
    for (let i = 0; i < paths.length; i += 1) {
      const p = paths[i];
      const parent_id = parent.file_id;
      const folder = {
        file_id: path.resolve(parent_id, p),
        name: p,
        parent_file_id: parent_id,
        type: (() => {
          if (i === paths.length - 1) {
            if (type) {
              return type === FileType.File ? "file" : "folder";
            }
          }
          return "folder";
        })(),
      };
      parent = folder;
      parents.push(folder);
    }
    return Result.Ok(parents);
  }
  async download(file_id: string) {
    return Result.Ok({ url: file_id });
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
  async existing(file_id: string) {
    const r = await check_existing(file_id);
    if (r.error) {
      return r;
    }
    if (r.data) {
      const r2 = await file_info(file_id);
      if (r2.error) {
        return r2;
      }
      const { name, size, file_type } = r2.data;
      // return build_drive_file({
      //   file_id,
      //   name,
      // });
    }
    return Result.Ok(null);
  }
  async rename_file(file_id: string, name: string) {
    try {
      const r = path.parse(file_id);
      const next_filename = path.resolve(r.dir, name);
      renameSync(file_id, next_filename);
      return Result.Ok(null);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  }
  async delete_file(file_id: string) {
    const r = await file_info(file_id);
    if (r.error) {
      return r;
    }
    if (r.data.file_type === "directory") {
      return rmdir(file_id);
    }
    if (r.data.file_type === "file") {
      return rmfile(file_id);
    }
    return Result.Err("未知的文件类型");
  }
  async fetch_video_preview_info() {
    return Result.Err("请实现 fetch_video_preview_info 方法");
  }
  async fetch_video_preview_info_for_download() {
    return Result.Err("请实现 fetch_video_preview_info_for_download 方法");
  }
  async move_files_to_folder() {
    return Result.Err("请实现 move_files_to_folder 方法");
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
  async generate_thumbnail() {
    return Result.Err("请实现 generate_thumbnail 方法");
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
  on_print() {
    return () => {};
  }
}
