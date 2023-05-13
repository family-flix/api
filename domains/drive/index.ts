/**
 * @file 网盘所有逻辑
 */
import Joi from "joi";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { AliyunDrivePayload } from "@/domains/aliyundrive/types";
import { prisma, store } from "@/store";
import { Result, resultify } from "@/types";
import { random_string } from "@/utils";

const drivePayloadSchema = Joi.object({
  app_id: Joi.string().required(),
  drive_id: Joi.string().required(),
  device_id: Joi.string().required(),
  user_name: Joi.string().required(),
  avatar: Joi.string(),
  nick_name: Joi.string().allow(null, ""),
  aliyun_user_id: Joi.string().required(),
  access_token: Joi.string().required(),
  refresh_token: Joi.string().required(),
});

export class Drive {
  /** 网盘 id */
  id: string | null;
  /** 网盘所属用户 id */
  user_id: string | null;

  static async New(values: { id: string; user_id: string }) {
    const { id, user_id } = values;
    const drive = new Drive({ id, user_id });
    const r = await drive.ensure();
    if (r.error) {
      return Result.Err(r.error);
    }
    return Result.Ok(drive);
  }
  static async Add(payload: AliyunDrivePayload & { user_id: string }) {
    const { user_id, ...restPayload } = payload;
    const r = await resultify(
      drivePayloadSchema.validateAsync.bind(drivePayloadSchema)
    )(restPayload);
    if (r.error) {
      return Result.Err(r.error);
    }
    const {
      app_id,
      drive_id,
      device_id,
      avatar,
      nick_name,
      aliyun_user_id,
      user_name,
      access_token,
      refresh_token,
    } = r.data as AliyunDrivePayload;
    const existing_drive = await prisma.drive.findUnique({
      where: {
        drive_id,
      },
    });
    if (existing_drive) {
      return Result.Err("该云盘已存在，请检查信息后重试");
    }
    const created_drive = await prisma.drive.create({
      data: {
        id: random_string(15),
        app_id,
        drive_id,
        device_id,
        avatar,
        nick_name,
        aliyun_user_id,
        user_name,
        root_folder_id: "",
        root_folder_name: "",
        total_size: 0,
        used_size: 0,
        user_id,
        drive_token: {
          create: {
            id: random_string(15),
            access_token,
            refresh_token,
            expired_at: 0,
          },
        },
      },
    });
    return Result.Ok(created_drive);
  }

  constructor(options: Partial<{ id: string; user_id: string }>) {
    const { id = null, user_id = null } = options;
    this.id = id;
    this.user_id = user_id;
  }

  async ensure() {
    if (this.id === null) {
      return Result.Err("缺少云盘 id 参数");
    }
    if (this.user_id === null) {
      return Result.Err("缺少用户 id 参数");
    }
    const r = await prisma.drive.findUnique({
      where: {
        id: this.id,
      },
    });
    if (r === null) {
      return Result.Err("云盘不存在，请检查 id 是否正确");
    }
    return Result.Ok(r);
  }

  /**
   * 获取网盘详情并更新到数据库
   */
  async refresh_profile() {
    if (this.id === null) {
      return Result.Err("缺少 drive id 参数");
    }
    const client = new AliyunDriveClient({
      drive_id: this.id,
      store,
    });
    const r = await client.refresh_profile();
    if (r.error) {
      return Result.Err(r);
    }
    const { total_size, used_size } = r.data;
    const d = await prisma.drive.update({
      where: {
        id: this.id,
      },
      data: {
        total_size,
        used_size,
      },
      select: {
        avatar: true,
        user_name: true,
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
    if (this.id === null) {
      return Result.Err("缺少 drive id 参数");
    }
    const client = new AliyunDriveClient({
      drive_id: this.id,
      store,
    });
    const r = await client.refresh_profile();
    if (r.error) {
      return Result.Err(r);
    }
    const { total_size, used_size } = r.data;
    await prisma.drive.update({
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

  /** 设置索引根目录 */
  async set_root_folder(
    values: Partial<{
      root_folder_id: string;
      root_folder_name: string;
    }>
  ) {
    const drive_id = this.id;
    if (drive_id === null) {
      return Result.Err("缺少 drive id 参数");
    }
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
      const client = new AliyunDriveClient({ drive_id, store });
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
    await prisma.drive.update({
      where: {
        drive_id,
      },
      data: {
        root_folder_id,
        root_folder_name,
      },
    });
    return Result.Ok(null);
  }
}
