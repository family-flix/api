/**
 * @file 本地文件上传至阿里云盘
 * 打包成 js 放在 nas 上用
 * yarn esbuild domains/media_upload/index.ts --platform=node --target=node12 --define:DEBUG=true --bundle --outfile=dist/client.js
 */
import fs from "fs";
import path from "path";

import { BaseDomain, Handler } from "@/domains/base";
import { AliyunDriveClient } from "@/domains/clients/alipan/index";
import { file_info } from "@/domains/clients/alipan/utils";
import { DataStore } from "@/domains/store/types";
import { DriveClient } from "@/domains/clients/types";
import { parse_argv } from "@/utils/server";
import { Result } from "@/types/index";
import { r_id } from "@/utils";

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
  store: DataStore;
  client: DriveClient;
};

export class MediaUpload extends BaseDomain<TheTypesOfEvents> {
  /** 添加云盘 */
  static async Create(
    payload: {
      app_id: string;
      drive_id: number | string;
      device_id: string;
      avatar: string;
      name: string;
      user_id: string;
      access_token: string;
      refresh_token: string;
    },
    store: DataStore
  ) {
    const { device_id, drive_id, name, access_token, refresh_token } = payload;
    const existing = await store.prisma.drive.findFirst({ where: { unique_id: String(drive_id) } });
    if (!existing) {
      await store.prisma.drive.create({
        data: {
          id: r_id(),
          avatar: "",
          unique_id: String(drive_id),
          name,
          profile: JSON.stringify({
            device_id,
          }),
          drive_token: {
            create: {
              id: r_id(),
              data: JSON.stringify({
                access_token,
                refresh_token,
              }),
              expired_at: 0,
            },
          },
          user: {
            create: {
              id: r_id(),
            },
          },
        },
      });
    }
    const r = await AliyunDriveClient.Get({
      unique_id: String(drive_id),
      store,
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
    const u = new MediaUpload({
      drive_id,
      client,
      store,
    });
    return Result.Ok(u);
  }
  static ParseArgv(args: string[]) {
    return parse_argv(args);
  }

  drive_id: number | string;

  store: DataStore;
  client: DriveClient;

  constructor(props: Partial<{ _name: string }> & MediaUploadProps) {
    super(props);

    const { drive_id, store, client } = props;

    this.drive_id = drive_id;
    this.store = store;
    this.client = client;
  }

  async upload_file(body: {
    /** 文件路径 */
    filepath: string;
    /** 上传后的文件名 */
    filename: string;
    /** 上传到哪个父文件夹 */
    parent_file_id: string;
  }) {
    const { parent_file_id, filename, filepath } = body;
    const file_existing_r = await this.client.existing(parent_file_id, filename);
    if (file_existing_r.error) {
      return Result.Err(`check existing failed, because ${file_existing_r.error.message}`);
    }
    const file_existing = file_existing_r.data;
    if (file_existing) {
      return Result.Err(`the file existing`);
    }
    const result = await this.client.upload(filepath, {
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
    const filename = path.basename(filepath);
    const type_r = await file_info(filepath);
    if (type_r.error) {
      return Result.Err(`check filepath type failed, because ${type_r.error.message}`);
    }
    const type = type_r.data.file_type;
    if (type === "file") {
      this.emit(Events.Print, "共1个文件");
      this.emit(Events.Print, `第1个、${filename}`);
      const r = await this.upload_file({
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
    const folder_existing_r = await this.client.existing(root_file_id, folder.name);
    if (folder_existing_r.error) {
      return Result.Err(["check existing failed, because ", folder_existing_r.error.message].join(""));
    }
    let folder_existing = folder_existing_r.data
      ? {
          file_id: folder_existing_r.data.file_id,
        }
      : null;
    if (!folder_existing) {
      const r2 = await this.client.create_folder({ parent_file_id: root_file_id, name: folder.name });
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
        this.emit(Events.Print, `第${i + 1}个、${filename}`);
        const r = await this.upload_file({
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
