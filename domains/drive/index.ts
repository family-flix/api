/**
 * @file 云盘所有逻辑
 */
import dayjs from "dayjs";
import Joi from "joi";

import { AliyunBackupDriveClient } from "@/domains/aliyundrive";
import { AliyunDriveClient, AliyunDrivePayload, AliyunDriveProfile } from "@/domains/aliyundrive/types";
import { AliyunResourceClient } from "@/domains/aliyundrive/resource";
import { ArticleLineNode, ArticleSectionNode } from "@/domains/article";
import { DriveRecord } from "@/domains/store/types";
import { User } from "@/domains/user";
import { BaseDomain } from "@/domains/base";
import { DatabaseStore } from "@/domains/store";
import { Result, resultify } from "@/types";
import { parseJSONStr, r_id } from "@/utils";

import { DriveTypes } from "./constants";

const drivePayloadSchema = Joi.object({
  app_id: Joi.string().required(),
  drive_id: Joi.number().required(),
  device_id: Joi.string().required(),
  user_name: Joi.string().allow(null, ""),
  nick_name: Joi.string().allow(null, ""),
  avatar: Joi.string().allow(null, ""),
  user_id: Joi.string().required(),
  access_token: Joi.string().required(),
  refresh_token: Joi.string().required(),
  name: Joi.string().allow(null, ""),
  root_folder_id: Joi.string().allow(null, ""),
  used_size: Joi.number().allow(null, 0),
  total_size: Joi.number().allow(null, 0),
});

enum Events {
  Print,
}
type TheTypesOfEvents = {
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
};
type DriveProps = {
  id: string;
  profile: Pick<DriveRecord, "name" | "type" | "root_folder_id" | "root_folder_name"> & {
    drive_id: string;
    token_id: string;
  };
  client: AliyunBackupDriveClient | AliyunResourceClient;
  user: User;
  store: DatabaseStore;
};

export class Drive extends BaseDomain<TheTypesOfEvents> {
  /** create drive */
  static async Get(values: { id: string; user: User; store: DatabaseStore }) {
    const { id, user, store } = values;
    const drive_res = await store.find_drive({ id, user_id: user.id });
    if (drive_res.error) {
      return Result.Err(drive_res.error);
    }
    const drive_record = drive_res.data;
    if (drive_record === null) {
      return Result.Err("没有匹配的云盘记录");
    }
    const { type, name, profile, root_folder_id, root_folder_name, drive_token_id } = drive_record;
    const r = parseJSONStr<AliyunDriveProfile>(profile);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { drive_id } = r.data;
    // console.log("[DOMAIN]drive/index - Get", drive_id, type, drive_token_id);
    const client_res = await (async (): Promise<Result<AliyunDriveClient>> => {
      if (type === DriveTypes.AliyunBackupDrive) {
        const r = await AliyunBackupDriveClient.Get({ drive_id, store });
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const client = r.data;
        return Result.Ok(client);
      }
      if (type === DriveTypes.AliyunResourceDrive) {
        const r = await AliyunResourceClient.Get({ drive_id, store });
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const client = r.data;
        return Result.Ok(client);
      }
      return Result.Err("未知云盘类型");
    })();
    if (client_res.error) {
      return Result.Err(client_res.error.message);
    }
    return Result.Ok(
      new Drive({
        id,
        profile: {
          type,
          name,
          drive_id,
          token_id: drive_token_id,
          root_folder_id,
          root_folder_name,
        },
        client: client_res.data,
        user,
        store,
      })
    );
  }
  static async GetByUniqueId(values: { id?: string; user: User; store: DatabaseStore }) {
    const { id, user, store } = values;
    if (!id) {
      return Result.Err("缺少云盘 unique_id");
    }
    const drive_res = await store.find_drive({ unique_id: id, user_id: user.id });
    if (drive_res.error) {
      return Result.Err(drive_res.error);
    }
    const drive_record = drive_res.data;
    if (drive_record === null) {
      return Result.Err("没有匹配的云盘记录");
    }
    const { type, name, profile, root_folder_id, root_folder_name, drive_token_id } = drive_record;
    const r = parseJSONStr<AliyunDriveProfile>(profile);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { drive_id } = r.data;
    // console.log("[DOMAIN]drive/index - Get", drive_id, type, drive_token_id);
    const client_res = await (async (): Promise<Result<AliyunDriveClient>> => {
      if (type === DriveTypes.AliyunBackupDrive) {
        const r = await AliyunBackupDriveClient.Get({ drive_id, store });
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const client = r.data;
        return Result.Ok(client);
      }
      if (type === DriveTypes.AliyunResourceDrive) {
        const r = await AliyunResourceClient.Get({ drive_id, store });
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const client = r.data;
        return Result.Ok(client);
      }
      return Result.Err("未知云盘类型");
    })();
    if (client_res.error) {
      return Result.Err(client_res.error.message);
    }
    return Result.Ok(
      new Drive({
        id,
        profile: {
          type,
          name,
          drive_id,
          token_id: drive_token_id,
          root_folder_id,
          root_folder_name,
        },
        client: client_res.data,
        user,
        store,
      })
    );
  }
  static async Add(
    body: {
      type?: DriveTypes;
      payload: unknown;
      user: User;
    },
    store: DatabaseStore,
    options: Partial<{
      skip_ping: boolean;
    }> = {}
  ) {
    const { type = DriveTypes.AliyunBackupDrive, payload, user } = body;
    const { skip_ping = false } = options;
    const created_drive_res = await (async () => {
      if (type === DriveTypes.AliyunBackupDrive) {
        const r = await resultify(drivePayloadSchema.validateAsync.bind(drivePayloadSchema))(payload);
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const {
          app_id,
          drive_id,
          resource_drive_id,
          device_id,
          avatar,
          user_id: aliyun_user_id,
          name,
          user_name,
          nick_name,
          access_token,
          refresh_token,
          root_folder_id,
          used_size,
          total_size,
        } = r.data as AliyunDrivePayload;
        // console.log("[DOMAINS]Drive - Add", drive_id);
        const existing_drive = await store.prisma.drive.findUnique({
          where: {
            user_id_unique_id: {
              unique_id: String(drive_id),
              user_id: user.id,
            },
          },
        });
        if (existing_drive) {
          return Result.Err("该云盘已存在，请检查信息后重试", undefined, { id: existing_drive.id });
        }
        const client = new AliyunBackupDriveClient({
          // 这里给一个空的是为了下面能调用 ping 方法
          id: "",
          drive_id: String(drive_id),
          resource_drive_id,
          device_id,
          access_token,
          refresh_token,
          root_folder_id,
          store,
        });
        if (!skip_ping) {
          const status_res = await client.ping();
          if (status_res.error) {
            const { message } = status_res.error;
            if (message.includes("AccessToken is invalid")) {
              return Result.Err("云盘信息有误");
            }
            return Result.Err(status_res.error.message);
          }
        }
        const created_drive = await store.prisma.drive.create({
          data: {
            id: r_id(),
            name: name || user_name || nick_name,
            avatar,
            type: DriveTypes.AliyunBackupDrive,
            unique_id: String(drive_id),
            profile: JSON.stringify({
              avatar,
              user_name,
              nick_name,
              app_id,
              drive_id: String(drive_id),
              resource_drive_id,
              device_id,
              user_id: aliyun_user_id,
            } as AliyunDriveProfile),
            root_folder_id: root_folder_id ?? null,
            used_size: used_size ?? 0,
            total_size: total_size ?? 0,
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
              connect: {
                id: user.id,
              },
            },
          },
        });
        return Result.Ok({
          drive: created_drive,
          drive_id,
          client,
        });
      }
      if (type === DriveTypes.AliyunResourceDrive) {
        const { drive_id } = payload as { drive_id: string };
        // console.log("[DOMAIN]drive/index - before store.prisma.drive.findFirst", drive_id);
        const existing_drive = await store.prisma.drive.findFirst({
          where: {
            id: drive_id,
            user_id: user.id,
          },
          include: {
            drive_token: true,
          },
        });
        console.log("[DOMAIN]drive/index - before !existing_drive", existing_drive);
        if (!existing_drive) {
          return Result.Err("没有匹配的云盘记录");
        }
        const { avatar, name, profile, root_folder_id, drive_token, used_size, total_size } = existing_drive;
        const r = parseJSONStr<AliyunDriveProfile>(profile);
        console.log("[DOMAIN]drive/index - after r");
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const { resource_drive_id, device_id, user_id, app_id, nick_name, user_name } = r.data;
        const r2 = parseJSONStr<{ access_token: string; refresh_token: string }>(drive_token.data);
        console.log("[DOMAIN]drive/index - after r2");
        if (r2.error) {
          return Result.Err(r2.error.message);
        }
        if (!resource_drive_id) {
          return Result.Err("没有资源盘");
        }
        const existing_resource_drive = await store.prisma.drive.findFirst({
          where: {
            unique_id: String(resource_drive_id),
            user_id: user.id,
          },
        });
        if (existing_resource_drive) {
          return Result.Err("该云盘已存在，请检查信息后重试", undefined, { id: existing_resource_drive.id });
        }
        const { access_token, refresh_token } = r2.data;
        const client = new AliyunResourceClient({
          id: "",
          drive_id: resource_drive_id,
          device_id,
          access_token,
          refresh_token,
          root_folder_id,
          store,
        });
        console.log("[DOMAIN]drive/index - before store.prisma.drive.create");
        const created_drive = await store.prisma.drive.create({
          data: {
            id: r_id(),
            name: `资源盘/${name}`,
            avatar,
            type: DriveTypes.AliyunResourceDrive,
            unique_id: String(resource_drive_id),
            profile: JSON.stringify({
              backup_drive_id: drive_id,
              avatar,
              user_name,
              nick_name,
              app_id,
              drive_id: String(resource_drive_id),
              device_id,
              user_id,
            } as AliyunDriveProfile),
            root_folder_id: root_folder_id ?? null,
            used_size: used_size ?? 0,
            total_size: total_size ?? 0,
            drive_token: {
              connect: {
                id: drive_token.id,
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
          drive: created_drive,
          drive_id,
          client,
        });
      }
      return Result.Err("未知云盘类型");
    })();
    if (created_drive_res.error) {
      return Result.Err(created_drive_res);
    }
    const {
      drive_id,
      client,
      drive: { id, name, root_folder_id, root_folder_name, drive_token_id },
    } = created_drive_res.data;
    return Result.Ok(
      new Drive({
        id,
        profile: {
          type,
          name,
          drive_id: String(drive_id),
          token_id: drive_token_id,
          root_folder_id: root_folder_id,
          root_folder_name: root_folder_name,
        },
        client,
        user,
        store,
      })
    );
  }
  static async Existing(body: { drive_id: number; user_id: string }, store: DatabaseStore) {
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
  /** 云盘名称 */
  name: string;
  /** 云盘所属用户 id */
  user_id: string;
  profile: DriveProps["profile"];
  client: AliyunBackupDriveClient | AliyunResourceClient;
  store: DatabaseStore;

  constructor(options: DriveProps) {
    super();

    const { id, profile, client, user, store } = options;
    this.name = profile.name;
    this.id = id;
    this.profile = profile;
    this.user_id = user.id;
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
    const d = await store.prisma.drive.update({
      where: {
        id: this.id,
      },
      data: {
        updated: dayjs().toISOString(),
        total_size,
        used_size,
      },
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
}
