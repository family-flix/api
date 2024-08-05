/**
 * @file 云盘所有逻辑
 */
import dayjs from "dayjs";
import Joi from "joi";

import { BaseDomain, Handler } from "@/domains/base";
import { AliyunDriveClient } from "@/domains/clients/alipan/index";
import { AliyunDriveProfile } from "@/domains/clients/alipan/types";
import { Article, ArticleLineNode, ArticleSectionNode } from "@/domains/article/index";
import { Folder } from "@/domains/folder/index";
import { ModelQuery, DriveRecord, DataStore } from "@/domains/store/types";
// import { Cloud189DriveClient } from "@/domains/clients/cloud189/index";
import { QuarkDriveClient } from "@/domains/clients/quark/index";
import { LocalFileDriveClient } from "@/domains/clients/local/index";
import { DriveClient } from "@/domains/clients/types";
import { DatabaseDriveClient } from "@/domains/clients/database/index";
import { User } from "@/domains/user/index";
import { Result, resultify } from "@/domains/result/index";
import { DatabaseStore } from "@/domains/store/index";
import { FileType } from "@/constants/index";
import { parseJSONStr } from "@/utils/index";

import { DriveTypes } from "./constants";

enum Events {
  Print,
}
type TheTypesOfEvents = {
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
};
type DriveProps = {
  id: string;
  type: DriveTypes;
  profile: Pick<DriveRecord, "name" | "type" | "root_folder_id" | "root_folder_name" | "total_size" | "used_size"> & {
    drive_id: string;
    token_id: string;
  } & AliyunDriveProfile;
  client: DriveClient;
  user?: { id: string };
  store: DataStore;
};

export class Drive extends BaseDomain<TheTypesOfEvents> {
  /** create drive */
  static async Get(values: { id?: string; unique_id?: string; user?: { id: string }; store: DataStore }) {
    const { id, unique_id, user, store } = values;
    if (!id && !unique_id) {
      return Result.Err("缺少 id 参数");
    }
    const where: ModelQuery<"drive"> = {};
    if (user) {
      where.user_id = user.id;
    }
    if (id) {
      where.id = id;
    }
    if (unique_id) {
      where.unique_id = unique_id;
    }
    const drive_record = await store.prisma.drive.findFirst({ where });
    if (drive_record === null) {
      return Result.Err("没有匹配的云盘记录", 1004);
    }
    const { type, name, profile, used_size, total_size, root_folder_id, root_folder_name, drive_token_id } =
      drive_record;
    const r = parseJSONStr<AliyunDriveProfile>(profile);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { drive_id, ...rest } = r.data;
    const client_res = await (async () => {
      if (type === DriveTypes.AliyunBackupDrive || type === DriveTypes.AliyunResourceDrive) {
        const r = await AliyunDriveClient.Get({ unique_id: drive_record.unique_id, store });
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const client = r.data;
        return Result.Ok(client);
      }
      // if (type === DriveTypes.Cloud189Drive) {
      //   const r = await Cloud189DriveClient.Get({ id, store });
      //   if (r.error) {
      //     return Result.Err(r.error.message);
      //   }
      //   const client = r.data;
      //   return Result.Ok(client);
      // }
      if (type === DriveTypes.QuarkDrive) {
        const r = await QuarkDriveClient.Get({ id, store });
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const client = r.data;
        return Result.Ok(client);
      }
      if (type === DriveTypes.LocalFolder) {
        const r = await LocalFileDriveClient.Get({ unique_id: drive_record.unique_id, store });
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const client = r.data;
        return Result.Ok(client);
      }
      return Result.Err(`type '${type}' 没有匹配的 client`);
    })();
    if (client_res.error) {
      return Result.Err(client_res.error.message);
    }
    return Result.Ok(
      new Drive({
        id: drive_record.id,
        type: type ?? DriveTypes.AliyunBackupDrive,
        profile: {
          type,
          name,
          drive_id,
          token_id: drive_token_id,
          root_folder_id,
          root_folder_name,
          used_size,
          total_size,
          ...rest,
        },
        client: client_res.data,
        user,
        store,
      })
    );
  }
  static async Create(body: { type: DriveTypes; payload: unknown; skip_ping?: boolean; user: User; store: DataStore }) {
    const { type, payload, user, store, skip_ping = false } = body;
    const created_drive_res = await (() => {
      if (type === DriveTypes.AliyunBackupDrive) {
        return AliyunDriveClient.Create({ payload, skip_ping, store, user });
      }
      if (type === DriveTypes.AliyunResourceDrive) {
        return AliyunDriveClient.CreateResourceDrive({ payload, skip_ping, store, user });
      }
      // if (type === DriveTypes.Cloud189Drive) {
      //   return Cloud189DriveClient.Create({ payload, skip_ping, store, user });
      // }
      // if (type === DriveTypes.QuarkDrive) {
      //   return QuarkDriveClient.Create({ payload, skip_ping, store, user });
      // }
      if (type === DriveTypes.LocalFolder) {
        return LocalFileDriveClient.Create({ payload, store, user });
      }
      return Result.Err("未知或暂不支持的云盘类型");
    })();
    if (created_drive_res.error) {
      return Result.Err(created_drive_res.error.message);
    }
    const {
      client,
      record: { id, name, root_folder_id, root_folder_name, used_size, total_size, drive_token_id, profile },
    } = created_drive_res.data;
    const json_res = await parseJSONStr<AliyunDriveProfile>(profile);
    if (json_res.error) {
      return Result.Err(json_res.error.message);
    }
    return Result.Ok(
      new Drive({
        id,
        type,
        profile: {
          type,
          name,
          token_id: drive_token_id,
          root_folder_id: root_folder_id,
          root_folder_name: root_folder_name,
          used_size,
          total_size,
          ...json_res.data,
        },
        client,
        user,
        store,
      })
    );
  }
  static async Existing(body: { drive_id: number; user_id: string }, store: DataStore) {
    const { drive_id, user_id } = body;
    const existing_drive = await store.prisma.drive.findUnique({
      where: {
        user_id_unique_id: {
          unique_id: String(drive_id),
          user_id,
        },
      },
    });
    if (existing_drive) {
      return Result.Ok(existing_drive);
    }
    return Result.Err("不存在");
  }

  /** 云盘 id */
  id: string;
  type: DriveTypes;
  /** 云盘名称 */
  name: string;
  /** 云盘所属用户 id */
  user?: { id: string };
  profile: DriveProps["profile"];
  client: DriveClient;
  store: DataStore;

  constructor(options: DriveProps) {
    super();

    const { id, type, profile, client, user, store } = options;
    this.name = profile.name;
    this.type = type;
    this.id = id;
    this.profile = profile;
    this.user = user;
    this.store = store;
    this.client = client;
  }
  /**
   * 获取网盘详情并更新到数据库
   */
  async refresh_profile() {
    const { store, client } = this;
    const r = await client.refresh_profile();
    if (r.error) {
      return Result.Err(r);
    }
    const { total_size, used_size } = r.data;
    const payload: {
      updated: string;
      total_size: number;
      used_size: number;
      profile?: string;
    } = {
      updated: dayjs().toISOString(),
      total_size,
      used_size,
    };
    if (client instanceof AliyunDriveClient) {
      const r2 = await client.fetch_vip_info();
      if (r2.data) {
        const { user_name, nick_name, avatar, drive_id, device_id, user_id, app_id, resource_drive_id } = this.profile;
        const next_profile = {
          user_name,
          nick_name,
          avatar,
          drive_id,
          device_id,
          user_id,
          app_id,
          resource_drive_id,
          vip: r2.data.list,
        };
        payload.profile = JSON.stringify(next_profile);
      }
    }
    const d = await store.prisma.drive.update({
      where: {
        id: this.id,
      },
      data: payload,
      select: {
        avatar: true,
        name: true,
        used_size: true,
        total_size: true,
      },
    });
    return Result.Ok(d);
  }
  /**
   * 刷新网盘 token
   */
  async refresh() {
    const { client, store } = this;
    const r = await client.refresh_profile();
    if (r.error) {
      return Result.Err(r.error);
    }
    const { total_size, used_size } = r.data;
    await store.prisma.drive.update({
      where: {
        id: this.id,
      },
      data: {
        updated: dayjs().toISOString(),
        total_size,
        used_size,
      },
    });
    return Result.Ok(null);
  }
  has_root_folder() {
    if (!this.profile.root_folder_id || !this.profile.root_folder_name) {
      return false;
    }
    return true;
  }
  /** 设置索引根目录 */
  async set_root_folder(
    values: Partial<{
      root_folder_id: string;
      root_folder_name: string;
    }>
  ) {
    const { store, client } = this;
    const schema = Joi.object({
      root_folder_id: Joi.string().required(),
      root_folder_name: Joi.string().allow(null, ""),
    });
    const r = await resultify(schema.validateAsync.bind(schema))(values);
    if (r.error) {
      return Result.Err(r.error);
    }
    const r2 = await (async () => {
      const { root_folder_id, root_folder_name } = values;
      if (root_folder_name) {
        return Result.Ok(
          values as {
            root_folder_id: string;
            root_folder_name: string;
          }
        );
      }
      if (!root_folder_id) {
        return Result.Err("索引根目录为空");
      }
      const file_res = await client.fetch_file(root_folder_id);
      if (file_res.error) {
        return Result.Err(file_res.error);
      }
      return Result.Ok({
        root_folder_id,
        root_folder_name: file_res.data.name,
      } as {
        root_folder_id: string;
        root_folder_name: string;
      });
    })();
    if (r2.error) {
      return Result.Err(r2.error);
    }
    const { root_folder_id, root_folder_name } = r2.data;
    await store.prisma.drive.update({
      where: {
        id: this.id,
      },
      data: {
        updated: dayjs().toISOString(),
        root_folder_id,
        root_folder_name,
      },
    });
    return Result.Ok(null);
  }
  /** 容量是否超出 */
  async is_exceed_capacity() {
    const r = await this.client.refresh_profile();
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { total_size, used_size } = r.data;
    if (used_size >= total_size) {
      return Result.Ok(true);
    }
    return Result.Ok(false);
  }
  /** 设置云盘名称（所有地方都展示这个名字） */
  async set_name(values: { name: string; remark?: string }) {
    const { store } = this;
    const schema = Joi.object({
      name: Joi.string().required(),
      remark: Joi.string(),
    });
    const r = await resultify(schema.validateAsync.bind(schema))(values);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { name, remark } = values;
    const data: { updated: string; name: string; remark?: string } = {
      updated: dayjs().toISOString(),
      name,
    };
    if (remark) {
      data.remark = remark;
    }
    await store.prisma.drive.update({
      where: {
        id: this.id,
      },
      data,
    });
    return Result.Ok(null);
  }
  async delete_folder_record_and_relative_record(file_id: string) {
    const file = await this.store.prisma.file.findFirst({
      where: {
        file_id,
        user_id: this.user?.id,
      },
    });
    if (file) {
      await this.store.prisma.file.delete({
        where: {
          id: file.id,
        },
      });
    }
    const resource_sync_task = await this.store.prisma.resource_sync_task.findFirst({
      where: {
        file_id_link_resource: file_id,
        user_id: this.user?.id,
      },
    });
    if (resource_sync_task) {
      await this.store.prisma.resource_sync_task.delete({
        where: {
          id: resource_sync_task.id,
        },
      });
    }
    return Result.Ok(null);
  }
  async delete_file_record_and_relative_record(file_id: string) {
    const file = await this.store.prisma.file.findFirst({
      where: {
        file_id,
        user_id: this.user?.id,
      },
    });
    if (file) {
      await this.store.prisma.file.delete({
        where: {
          id: file.id,
        },
      });
    }
    const parsed_media_source = await this.store.prisma.parsed_media_source.findFirst({
      where: {
        file_id,
        user_id: this.user?.id,
      },
    });
    if (parsed_media_source) {
      await this.store.prisma.parsed_media_source.delete({
        where: {
          id: parsed_media_source.id,
        },
      });
    }
    return Result.Ok(null);
  }
  /**
   * 删除一个文件夹
   */
  async delete_folder(f: { file_id: string; name: string; drive_id: string }) {
    const { file_id, name, drive_id } = f;
    const folder = new Folder(file_id, {
      name,
      client: new DatabaseDriveClient({ drive_id, store: this.store }),
    });
    const r = await folder.walk(async (file) => {
      if (file.type === "file") {
        await this.delete_file_record_and_relative_record(file.id);
      }
      if (file.type === "folder") {
        await this.delete_folder_record_and_relative_record(file.id);
      }
      return true;
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const r2 = await this.delete_folder_record_and_relative_record(f.file_id);
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    return Result.Ok(null);
  }
  /**
   * 删除云盘内的指定文件
   */
  async delete_file_or_folder_in_drive(
    file_id: string,
    opt: Partial<{ callback: (file: { name: string }) => void }> = {}
  ) {
    const file = await this.store.prisma.file.findFirst({
      where: {
        file_id,
        user_id: this.user?.id,
      },
    });
    if (!file) {
      const r = await this.client.delete_file(file_id);
      if (r.error) {
        this.emit(Events.Print, Article.build_line(["从云盘删除失败，因为", r.error.message]));
        return Result.Err(r.error.message);
      }
      this.emit(Events.Print, Article.build_line(["不存在记录，直接成功"]));
      return Result.Ok(null);
    }
    if (opt.callback) {
      opt.callback(file);
    }
    if (file.type === FileType.File) {
      this.emit(Events.Print, Article.build_line(["删除文件", file.name]));
      await this.delete_file_record_and_relative_record(file.file_id);
      // return Result.Ok(null);
    }
    if (file.type === FileType.Folder) {
      this.emit(Events.Print, Article.build_line(["删除文件夹", file.name]));
      await this.delete_folder(file);
      // return Result.Ok(null);
    }
    const r = await this.client.delete_file(file_id);
    if (r.error) {
      this.emit(Events.Print, Article.build_line(["从云盘删除失败，因为", r.error.message]));
      return Result.Err(r.error.message);
    }
    return Result.Ok(null);
  }
  /** 重命名（文件/文件夹），并重置解析结果 */
  async rename_file(file: { file_id: string }, values: { name: string }) {
    const { name } = values;
    const r = await this.client.rename_file(file.file_id, name);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const f = await this.store.prisma.file.findFirst({
      where: {
        file_id: file.file_id,
        user_id: this.user?.id,
      },
    });
    if (!f) {
      return Result.Ok(null);
    }
    const updated = await this.store.prisma.file.update({
      where: {
        id: f.id,
      },
      data: {
        name,
      },
    });
    if (f.type === FileType.File) {
      const existing_parsed_episode = await this.store.prisma.parsed_media_source.findFirst({
        where: {
          file_id: file.file_id,
          user_id: this.user?.id,
        },
        include: {
          parsed_media: {
            include: {
              _count: true,
            },
          },
        },
      });
      if (existing_parsed_episode) {
        await this.store.prisma.parsed_media_source.delete({
          where: {
            id: existing_parsed_episode.id,
          },
        });
      }
      return Result.Ok(null);
    }
    if (f.type === FileType.Folder) {
      await this.store.prisma.resource_sync_task.updateMany({
        where: {
          file_id_link_resource: file.file_id,
          user_id: this.user?.id,
        },
        data: {
          file_name_link_resource: name,
        },
      });
      await this.store.prisma.file.updateMany({
        where: {
          parent_file_id: f.id,
          user_id: this.user?.id,
        },
        data: {
          parent_paths: [updated.parent_paths, updated.name].join("/"),
        },
      });
      // const folder = new Folder(f.id, {
      //   client: this.client,
      // });
      // await folder.walk(async (sub_file) => {
      //   return true;
      // });
    }
    return Result.Ok(null);
  }

  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
}
