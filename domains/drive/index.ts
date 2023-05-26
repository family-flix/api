/**
 * @file 云盘所有逻辑
 */
import Joi from "joi";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { AliyunDrivePayload } from "@/domains/aliyundrive/types";
import { ArticleLineNode, ArticleSectionNode } from "@/domains/article";
import { BaseDomain } from "@/domains/base";
import { Result, resultify } from "@/types";
import { r_id } from "@/utils";
import { store_factory } from "@/store";
import { DriveRecord } from "@/store/types";

const drivePayloadSchema = Joi.object({
  app_id: Joi.string().required(),
  drive_id: Joi.string().required(),
  device_id: Joi.string().required(),
  user_name: Joi.string().allow(null, ""),
  nick_name: Joi.string().allow(null, ""),
  avatar: Joi.string(),
  aliyun_user_id: Joi.string().required(),
  access_token: Joi.string().required(),
  refresh_token: Joi.string().required(),
});

enum Events {
  Print,
}
type TheTypesOfEvents = {
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
};
type DriveProps = {
  id: string;
  profile: Pick<DriveRecord, "name" | "root_folder_id" | "root_folder_name">;
  user_id: string;
  store: ReturnType<typeof store_factory>;
};

export class Drive extends BaseDomain<TheTypesOfEvents> {
  /** create drive */
  static async Get(values: { id: string; user_id: string; store: ReturnType<typeof store_factory> }) {
    const { id, user_id, store } = values;
    const drive_res = await store.find_drive({ id, user_id });
    if (drive_res.error) {
      return Result.Err(drive_res.error);
    }
    const profile = drive_res.data;
    if (profile === null) {
      return Result.Err("没有匹配的云盘记录");
    }
    const { name, root_folder_id, root_folder_name } = profile;
    const drive = new Drive({
      id,
      profile: {
        name,
        root_folder_id,
        root_folder_name,
      },
      user_id,
      store,
    });
    return Result.Ok(drive);
  }
  static async New(body: { payload: AliyunDrivePayload; store: ReturnType<typeof store_factory>; user_id: string }) {
    const { user_id, payload, store } = body;
    const r = await resultify(drivePayloadSchema.validateAsync.bind(drivePayloadSchema))(payload);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { app_id, drive_id, device_id, avatar, aliyun_user_id, user_name, nick_name, access_token, refresh_token } =
      r.data as AliyunDrivePayload;
    const existing_drive = await resultify(store.prisma.drive.findUnique.bind(store.prisma.drive))({
      where: {
        drive_id,
      },
    });
    if (existing_drive.error) {
      return Result.Err(existing_drive.error);
    }
    if (existing_drive.data) {
      return Result.Err("该云盘已存在，请检查信息后重试", undefined, { id: existing_drive.data.id });
    }
    const created_drive = await resultify(store.prisma.drive.create.bind(store.prisma.drive))({
      data: {
        id: r_id(),
        name: user_name || nick_name,
        avatar,
        app_id,
        drive_id,
        device_id,
        aliyun_user_id,
        user_id,
        drive_token: {
          create: {
            id: r_id(),
            access_token,
            refresh_token,
            expired_at: 0,
          },
        },
      },
    });
    if (created_drive.error) {
      return Result.Err(created_drive.error);
    }
    const drive_data = created_drive.data;
    const { name, root_folder_id, root_folder_name } = drive_data;
    const drive = new Drive({
      id: drive_data.id,
      profile: {
        name,
        root_folder_id,
        root_folder_name,
      },
      user_id,
      store,
    });
    return Result.Ok(drive);
  }

  name: string;
  /** 网盘 id */
  id: string;
  /** 网盘所属用户 id */
  user_id: string;
  profile: DriveProps["profile"];
  client: AliyunDriveClient;
  store: ReturnType<typeof store_factory>;

  constructor(options: DriveProps) {
    super();

    const { id, profile, user_id, store } = options;
    this.name = profile.name;
    this.id = id;
    this.profile = profile;
    this.user_id = user_id;
    this.store = store;
    this.client = new AliyunDriveClient({ drive_id: id, store });
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
  async refresh_token() {
    const { client, store } = this;
    const r = await client.refresh_profile();
    if (r.error) {
      return Result.Err(r.error);
    }
    const { total_size, used_size } = r.data;
    await store.prisma.drive.update({
      where: {
        drive_id: this.id,
      },
      data: {
        total_size,
        used_size,
      },
    });
    return Result.Ok(null);
  }

  has_root_folder() {
    if (this.profile.root_folder_id === null) {
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
        drive_id: this.id,
      },
      data: {
        root_folder_id,
        root_folder_name,
      },
    });
    return Result.Ok(null);
  }
}
