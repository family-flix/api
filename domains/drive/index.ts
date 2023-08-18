/**
 * @file 云盘所有逻辑
 */
import Joi from "joi";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { AliyunDrivePayload } from "@/domains/aliyundrive/types";
import { ArticleLineNode, ArticleSectionNode } from "@/domains/article";
import { DriveRecord } from "@/domains/store/types";
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
  profile: Pick<DriveRecord, "name" | "root_folder_id" | "root_folder_name"> & { drive_id: number };
  client: AliyunDriveClient;
  user_id: string;
  store: DatabaseStore;
};

export class Drive extends BaseDomain<TheTypesOfEvents> {
  /** create drive */
  static async Get(values: { id: string; user_id: string; store: DatabaseStore }) {
    const { id, user_id, store } = values;
    const drive_res = await store.find_drive({ id, user_id });
    if (drive_res.error) {
      return Result.Err(drive_res.error);
    }
    const drive_record = drive_res.data;
    if (drive_record === null) {
      return Result.Err("没有匹配的云盘记录");
    }
    const { name, profile, root_folder_id, root_folder_name } = drive_record;
    const r = await parseJSONStr<{ drive_id: number }>(profile);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { drive_id } = r.data;
    const client_res = await AliyunDriveClient.Get({ drive_id, store });
    if (client_res.error) {
      return Result.Err(client_res);
    }
    const client = client_res.data;
    const drive_ins = new Drive({
      id,
      profile: {
        name,
        drive_id,
        root_folder_id,
        root_folder_name,
      },
      client,
      user_id,
      store,
    });
    return Result.Ok(drive_ins);
  }
  static async Add(
    body: { payload: AliyunDrivePayload; user_id: string },
    store: DatabaseStore,
    options: Partial<{
      skip_ping: boolean;
    }> = {}
  ) {
    const { payload, user_id } = body;
    const { skip_ping = false } = options;
    const r = await resultify(drivePayloadSchema.validateAsync.bind(drivePayloadSchema))(payload);
    if (r.error) {
      return Result.Err(r.error);
    }
    const {
      app_id,
      drive_id,
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
          user_id,
        },
      },
    });
    if (existing_drive) {
      return Result.Err("该云盘已存在，请检查信息后重试", undefined, { id: existing_drive.id });
    }
    const client = new AliyunDriveClient({
      // 这里给一个空的是为了下面能调用 ping 方法
      id: "",
      drive_id,
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
        return Result.Err(status_res.error);
      }
    }
    const created_drive = await store.prisma.drive.create({
      data: {
        id: r_id(),
        name: name || user_name || nick_name,
        avatar,
        type: DriveTypes.Aliyun,
        unique_id: String(drive_id),
        profile: JSON.stringify({
          app_id,
          drive_id,
          device_id,
          user_id: aliyun_user_id,
        }),
        user_id,
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
      },
    });
    const drive_data = created_drive;
    const drive = new Drive({
      id: drive_data.id,
      profile: {
        name: drive_data.name,
        drive_id,
        root_folder_id: drive_data.root_folder_id,
        root_folder_name: drive_data.root_folder_name,
      },
      client,
      user_id,
      store,
    });
    return Result.Ok(drive);
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
  client: AliyunDriveClient;
  store: DatabaseStore;

  constructor(options: DriveProps) {
    super();

    const { id, profile, client, user_id, store } = options;
    this.name = profile.name;
    this.id = id;
    this.profile = profile;
    this.user_id = user_id;
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
        root_folder_id,
        root_folder_name,
      },
    });
    return Result.Ok(null);
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
    const data: { name: string; remark?: string } = {
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
