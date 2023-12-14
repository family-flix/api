/**
 * @file 本地文件上传至阿里云盘
 * yarn esbuild domains/media_upload/index.ts --platform=node --target=node12 --define:DEBUG=true --bundle --outfile=dist/client.js
 */
import fs from "fs";
import path from "path";

import { AliyunBackupDriveClient } from "@/domains/aliyundrive";
import { JSONFileStore } from "@/domains/store/jsonfile";
import { BaseDomain, Handler } from "@/domains/base";
import { parse_argv } from "@/utils/server";
import { Result } from "@/types";
import { check_path_type } from "@/src/bin/utils";

enum Events {
  Change,
  Print,
}
type TheTypesOfEvents = {
  [Events.Change]: void;
  [Events.Print]: string;
};
type MediaUploadProps = {
  drive_id: number | string;
  db_url: string;
};

export class MediaUpload extends BaseDomain<TheTypesOfEvents> {
  static ParseArgv(args: string[]) {
    return parse_argv(args);
  }

  drive_id: number | string;
  store: JSONFileStore;

  constructor(props: Partial<{ _name: string }> & MediaUploadProps) {
    super(props);

    const { drive_id, db_url } = props;
    this.drive_id = drive_id;
    this.store = new JSONFileStore({
      filepath: db_url,
    });
  }
  /** 获取云盘（如果没有就添加） */
  async fetch_drive(payload: { drive_id: number | string }) {
    const { drive_id } = payload;
    const existing_r = this.store.find_drive({ unique_id: String(drive_id) });
    if (existing_r.error) {
      return Result.Err(`find drive failed, because ${existing_r.error.message}`);
    }
    const existing = existing_r.data;
    if (!existing) {
      return Result.Err("please create drive");
    }
    const r = await AliyunBackupDriveClient.Get({
      drive_id: String(drive_id),
      // @ts-ignore
      store: this.store,
    });
    if (r.error) {
      return Result.Err(`获取 drive 失败，因为, ${r.error.message}`);
    }
    const client = r.data;
    client.debug = true;
    const r2 = await client.ensure_initialized();
    if (r2.error) {
      return Result.Err(`initialize drive failed, because , ${r2.error.message}`);
    }
    return Result.Ok(client);
  }
  /** 添加云盘 */
  async create_drive(payload: {
    app_id: string;
    drive_id: number | string;
    device_id: string;
    avatar: string;
    name: string;
    user_id: string;
    access_token: string;
    refresh_token: string;
  }) {
    const { device_id, drive_id, name, access_token, refresh_token } = payload;
    const existing_r = this.store.find_drive({ unique_id: String(drive_id) });
    if (existing_r.error) {
      return Result.Err(`find drive failed, because ${existing_r.error.message}`);
    }
    const existing = existing_r.data;
    if (!existing) {
      const drive_body = {
        unique_id: drive_id,
        name,
        profile: JSON.stringify({
          device_id,
        }),
        drive_token: {
          data: JSON.stringify({
            access_token,
            refresh_token,
          }),
        },
      };
      // @ts-ignore
      await this.store.create_drive(drive_body);
    }
    const r = await AliyunBackupDriveClient.Get({
      drive_id: String(drive_id),
      // @ts-ignore
      store: this.store,
    });
    if (r.error) {
      return Result.Err(`获取 drive 失败，因为, ${r.error.message}`);
    }
    const client = r.data;
    client.debug = true;
    const r2 = await client.ensure_initialized();
    if (r2.error) {
      return Result.Err(`initialize drive failed, because , ${r2.error.message}`);
    }
    return Result.Ok(client);
  }

  async upload_file(body: {
    /** 文件路径 */
    filepath: string;
    /** 上传后的文件名 */
    filename: string;
    /** 上传到哪个父文件夹 */
    parent_file_id: string;
    client: AliyunBackupDriveClient;
  }) {
    const { client, parent_file_id, filename, filepath } = body;
    const file_existing_r = await client.existing(parent_file_id, filename);
    if (file_existing_r.error) {
      return Result.Err(`check existing failed, because ${file_existing_r.error.message}`);
    }
    const file_existing = file_existing_r.data;
    if (file_existing) {
      return Result.Err(`the file existing`);
    }
    const result = await client.upload(filepath, {
      name: filename,
      parent_file_id,
      on_progress(v) {
        console.log(v);
      },
    });
    if (result.error) {
      return Result.Err(`upload failed, because ${result.error.message}`);
    }
    return Result.Ok(result.data);
  }

  async upload(filepath: string, options: { parent_file_id: string }) {
    const root_file_id = options.parent_file_id;
    const r = await this.fetch_drive({ drive_id: this.drive_id });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const client = r.data;
    const filename = path.basename(filepath);
    const type_r = await check_path_type(filepath);
    if (type_r.error) {
      return Result.Err(`check filepath type failed, because ${type_r.error.message}`);
    }
    const type = type_r.data;
    if (type === "file") {
      this.emit(Events.Print, "共1个文件");
      this.emit(Events.Print, `第1个、${filename}`);
      const r = await this.upload_file({
        client,
        filename,
        filepath: filepath,
        parent_file_id: root_file_id,
      });
      if (r.error) {
        return Result.Ok([
          {
            filepath,
            error: r.error.message,
          },
        ]);
      }
      const { file_id, file_name } = r.data;
      return Result.Ok([
        {
          file_id,
          file_name,
          filepath,
          error: null,
        },
      ]);
    }
    const folder = {
      name: filename,
    };
    const dir = filepath;
    const files = fs.readdirSync(dir);
    const folder_existing_r = await client.existing(root_file_id, folder.name);
    if (folder_existing_r.error) {
      return Result.Err(["check existing failed, because ", folder_existing_r.error.message].join(""));
    }
    let folder_existing = folder_existing_r.data
      ? {
          file_id: folder_existing_r.data.file_id,
        }
      : null;
    if (!folder_existing) {
      const r2 = await client.add_folder(
        { parent_file_id: root_file_id, name: folder.name },
        {
          check_name_mode: "refuse",
        }
      );
      if (r2.error) {
        this.debug && console.log(folder.name, " create folder failed, because ", r2.error.message);
        return Result.Err(["create folder failed, because ", r2.error.message].join(""));
      }
      folder_existing = r2.data;
    }
    if (!folder_existing) {
      return Result.Err("there is no parent folder that can save media files");
    }
    const result: {
      file_id?: string;
      file_name?: string;
      filepath: string;
      error: string | null;
    }[] = [];
    this.emit(Events.Print, `共${files.length}个文件`);
    for (let i = 0; i < files.length; i += 1) {
      await (async () => {
        const filename = files[i];
        const file_path = path.resolve(dir, filename);
        this.emit(Events.Print, `第${i}个、${filename}`);
        const r = await this.upload_file({
          client,
          parent_file_id: folder_existing.file_id,
          filename,
          filepath: file_path,
        });
        if (r.error) {
          result.push({
            filepath: file_path,
            error: r.error.message,
          });
          return;
        }
        const { file_id, file_name } = r.data;
        result.push({
          file_id,
          file_name,
          filepath,
          error: null,
        });
      })();
    }
    return Result.Ok(result);
  }

  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
}
