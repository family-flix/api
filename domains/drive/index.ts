/**
 * @file 云盘所有逻辑
 */
import { Handler } from "mitt";
import dayjs from "dayjs";
import Joi from "joi";

import { AliyunBackupDriveClient } from "@/domains/aliyundrive";
import { AliyunDriveClient, AliyunDrivePayload, AliyunDriveProfile } from "@/domains/aliyundrive/types";
import {
  Article,
  ArticleLineNode,
  ArticleListItemNode,
  ArticleListNode,
  ArticleSectionNode,
  ArticleTextNode,
} from "@/domains/article";
import { ModelParam, ModelQuery, DriveRecord, FileRecord } from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { User } from "@/domains/user";
import { BaseDomain } from "@/domains/base";
import { DatabaseStore } from "@/domains/store";
import { FileType } from "@/constants";
import { Result, resultify } from "@/types";
import { parseJSONStr, r_id } from "@/utils";
import { to_number } from "@/utils/primitive";

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
  type: DriveTypes;
  profile: Pick<DriveRecord, "name" | "type" | "root_folder_id" | "root_folder_name"> & {
    drive_id: string;
    token_id: string;
  } & AliyunDriveProfile;
  client: AliyunBackupDriveClient;
  user?: User;
  store: DatabaseStore;
};

export class Drive extends BaseDomain<TheTypesOfEvents> {
  /** create drive */
  static async Get(values: { id: string; user?: User; store: DatabaseStore }) {
    const { id, user, store } = values;
    const where: ModelQuery<"drive"> = {
      id,
    };
    if (user) {
      where.user_id = user.id;
    }
    const drive_record = await store.prisma.drive.findFirst({ where });
    if (drive_record === null) {
      return Result.Err("没有匹配的云盘记录");
    }
    const { type, name, profile, root_folder_id, root_folder_name, drive_token_id } = drive_record;
    const r = parseJSONStr<AliyunDriveProfile>(profile);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { drive_id, ...rest } = r.data;
    // console.log("[DOMAIN]drive/index - Get", drive_id, type, drive_token_id);
    const client_res = await (async (): Promise<Result<AliyunDriveClient>> => {
      const r = await AliyunBackupDriveClient.Get({ drive_id, store });
      if (r.error) {
        return Result.Err(r.error.message);
      }
      const client = r.data;
      return Result.Ok(client);
    })();
    if (client_res.error) {
      return Result.Err(client_res.error.message);
    }
    return Result.Ok(
      new Drive({
        id,
        type: type ?? DriveTypes.AliyunBackupDrive,
        profile: {
          type,
          name,
          drive_id,
          token_id: drive_token_id,
          root_folder_id,
          root_folder_name,
          ...rest,
        },
        client: client_res.data,
        user,
        store,
      })
    );
  }
  static async GetByUniqueId(values: { id?: string; user?: User; store: DatabaseStore }) {
    const { id, user, store } = values;
    if (!id) {
      return Result.Err("缺少云盘 unique_id");
    }
    const drive_record = await store.prisma.drive.findFirst({
      where: {
        unique_id: id,
        user_id: user ? user.id : undefined,
      },
    });
    if (drive_record === null) {
      return Result.Err("没有匹配的云盘记录");
    }
    const { type, name, profile, root_folder_id, root_folder_name, drive_token_id } = drive_record;
    const r = parseJSONStr<AliyunDriveProfile>(profile);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { drive_id, ...rest } = r.data;
    // console.log("[DOMAIN]drive/index - Get", drive_id, type, drive_token_id);
    const client_res = await (async (): Promise<Result<AliyunDriveClient>> => {
      const r = await AliyunBackupDriveClient.Get({ drive_id, store });
      if (r.error) {
        return Result.Err(r.error.message);
      }
      const client = r.data;
      return Result.Ok(client);
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
          ...rest,
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
        const drive_record_id = r_id();
        const client = new AliyunBackupDriveClient({
          // 这里给一个空的是为了下面能调用 ping 方法
          id: drive_record_id,
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
            id: drive_record_id,
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
        // console.log("[DOMAIN]drive/index - before !existing_drive", existing_drive);
        if (!existing_drive) {
          return Result.Err("没有匹配的云盘记录");
        }
        const { avatar, name, profile, root_folder_id, drive_token, used_size, total_size } = existing_drive;
        const r = parseJSONStr<AliyunDriveProfile>(profile);
        // console.log("[DOMAIN]drive/index - after r");
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const { resource_drive_id, device_id, user_id, app_id, nick_name, user_name } = r.data;
        const r2 = parseJSONStr<{ access_token: string; refresh_token: string }>(drive_token.data);
        // console.log("[DOMAIN]drive/index - after r2");
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
          return Result.Err("该资源盘已存在，请检查信息后重试", undefined, { id: existing_resource_drive.id });
        }
        const { access_token, refresh_token } = r2.data;
        const drive_record_id = r_id();
        const client = new AliyunBackupDriveClient({
          id: drive_record_id,
          drive_id: resource_drive_id,
          device_id,
          access_token,
          refresh_token,
          root_folder_id,
          store,
        });
        // console.log("[DOMAIN]drive/index - before store.prisma.drive.create");
        const created_drive = await store.prisma.drive.create({
          data: {
            id: drive_record_id,
            name: `资源盘/${name}`,
            avatar,
            type: DriveTypes.AliyunResourceDrive,
            unique_id: String(resource_drive_id),
            profile: JSON.stringify({
              avatar,
              user_name,
              nick_name,
              app_id,
              drive_id: String(resource_drive_id),
              device_id,
              user_id,
              backup_drive_id: drive_id,
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
      client,
      drive: { id, name, root_folder_id, root_folder_name, drive_token_id, profile },
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
          ...json_res.data,
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
  type: DriveTypes;
  /** 云盘名称 */
  name: string;
  /** 云盘所属用户 id */
  // user_id: string;
  profile: DriveProps["profile"];
  client: AliyunBackupDriveClient;
  store: DatabaseStore;

  constructor(options: DriveProps) {
    super();

    const { id, type, profile, client, user, store } = options;
    this.name = profile.name;
    this.type = type;
    this.id = id;
    this.profile = profile;
    // this.user_id = user.id;
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
    if (client instanceof AliyunBackupDriveClient) {
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
  /**
   * 删除云盘内一个文件
   */
  async delete_file(f: { file_id: string }, options: Partial<{ ignore_drive_file: boolean }> = {}) {
    const { file_id } = f;
    await this.store.prisma.file.deleteMany({
      where: {
        file_id,
      },
    });
    const where = {
      file_id,
    };
    // 删除关联的剧集
    const r2 = await this.store.prisma.parsed_episode.findMany({
      where,
    });
    if (r2.length) {
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r2.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name, text.episode_number].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await this.store.prisma.parsed_episode.deleteMany({
      where,
    });
    // 删除关联的电影
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["删除关联的解析电影结果"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r3 = await this.store.prisma.parsed_movie.findMany({
      where,
    });
    if (r3.length) {
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r3.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await this.store.prisma.parsed_movie.deleteMany({
      where,
    });
    // 删除关联的字幕
    const r4 = await this.store.prisma.subtitle.findMany({
      where,
    });
    if (r4.length) {
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r3.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await this.store.prisma.subtitle.deleteMany({
      where,
    });
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["开始删除云盘内文件"].map((text) => new ArticleTextNode({ text })),
      })
    );
    if (options.ignore_drive_file) {
      return Result.Ok(null);
    }
    const r5 = await this.client.delete_file(file_id);
    if (r5.error) {
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: ["删除云盘文件失败，因为", r5.error.message].map((text) => new ArticleTextNode({ text })),
        })
      );
      return Result.Err(r5.error.message);
    }
    return Result.Ok(null);
  }
  /**
   * 删除一个文件夹
   */
  async delete_folder(f: { file_id: string; name: string }) {
    const { name, file_id } = f;
    const files_res = await this.store.find_files({
      parent_file_id: file_id,
    });
    if (files_res.error) {
      return Result.Err(files_res.error.message);
    }
    const child_files = files_res.data;
    this.emit(
      Events.Print,
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [`文件夹 「${name}」 下有 ${child_files.length} 个文件夹/文件`].map(
              (text) => new ArticleTextNode({ text })
            ),
          }),
          new ArticleListNode({
            children: child_files.map((file) => {
              const { name, parent_paths } = file;
              return new ArticleListItemNode({
                children: [`${parent_paths}/${name}`].map((text) => new ArticleTextNode({ text })),
              });
            }),
          }),
        ],
      })
    );
    for (let i = 0; i < child_files.length; i += 1) {
      await (async () => {
        const child = child_files[i];
        const { type, name, parent_paths } = child;
        if (type === FileType.Folder) {
          this.emit(
            Events.Print,
            new ArticleSectionNode({
              children: [
                new ArticleLineNode({
                  children: [`[${parent_paths}/${name}]`, "是文件夹，先删除子文件夹及字文件"].map(
                    (text) => new ArticleTextNode({ text })
                  ),
                }),
              ],
            })
          );
          await this.delete_folder(child);
          this.emit(
            Events.Print,
            new ArticleSectionNode({
              children: [
                new ArticleLineNode({
                  children: [`[${parent_paths}/${name}]`, "子文件夹及字文件删除完毕"].map(
                    (text) => new ArticleTextNode({ text })
                  ),
                }),
              ],
            })
          );
          return;
        }
      })();
    }
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: [`删除文件夹 「${name}」 下的所有子文件/文件`].map((text) => new ArticleTextNode({ text })),
      })
    );
    await this.store.prisma.file.deleteMany({
      where: {
        file_id: {
          in: child_files.map((f) => f.file_id),
        },
      },
    });
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["删除关联的同步任务"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r1 = await this.store.prisma.bind_for_parsed_tv.findMany({
      where: {
        file_id_link_resource: {
          in: child_files.map((f) => f.file_id),
        },
      },
    });
    if (r1.length) {
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r1.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await this.store.prisma.bind_for_parsed_tv.deleteMany({
      where: {
        file_id_link_resource: {
          in: [f, ...child_files].map((f) => f.file_id),
        },
      },
    });
    const where = {
      file_id: {
        in: [f, ...child_files].map((f) => f.file_id),
      },
    };
    // 删除关联的剧集源
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["删除关联的剧集源"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r2 = await this.store.prisma.parsed_episode.findMany({
      where,
    });
    if (r2.length) {
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r2.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.id, "/", text.episode_number].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await this.store.prisma.parsed_episode.deleteMany({
      where,
    });
    // 删除关联的季
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["删除关联的解析季"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r3 = await this.store.prisma.parsed_season.findMany({
      where,
    });
    if (r3.length) {
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r3.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.season_number].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await this.store.prisma.parsed_season.deleteMany({
      where,
    });
    // 删除关联的电视剧
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["开始删除关联的解析电视剧结果"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r4 = await this.store.prisma.parsed_tv.findMany({
      where,
    });
    if (r4.length) {
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r4.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name || ""].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await this.store.prisma.parsed_tv.deleteMany({
      where,
    });
    // 删除关联的电影
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["删除关联的解析电影结果"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r5 = await this.store.prisma.parsed_movie.findMany({
      where,
    });
    if (r5.length) {
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r5.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await this.store.prisma.parsed_movie.deleteMany({
      where,
    });
    const r6 = await this.store.prisma.subtitle.findMany({
      where,
    });
    if (r6.length) {
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r5.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await this.store.prisma.subtitle.deleteMany({
      where,
    });
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["删除起始文件夹", f.name, f.file_id].map((text) => new ArticleTextNode({ text })),
      })
    );
    await this.store.prisma.file.deleteMany({
      where: {
        file_id: {
          in: [f.file_id],
        },
      },
    });
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["开始删除云盘内文件"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r7 = await this.client.delete_file(file_id);
    if (r7.error) {
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: ["删除云盘文件失败，因为", r7.error.message].map((text) => new ArticleTextNode({ text })),
        })
      );
    }
    return Result.Ok(null);
  }
  /**
   * 删除云盘内的指定文件
   */
  async delete_file_in_drive(file_id: string) {
    const file_res = await this.store.find_file({
      file_id,
    });
    if (file_res.error) {
      return Result.Err(file_res.error.message);
    }
    const file = file_res.data;
    if (!file) {
      await this.store.prisma.subtitle.deleteMany({
        where: {
          file_id,
        },
      });
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: ["直接删除还未索引的文件"].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      const r = await this.client.delete_file(file_id);
      if (r.error) {
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: ["删除失败，因为", r.error.message].map((text) => {
              return new ArticleTextNode({ text });
            }),
          })
        );
        return Result.Err(r.error.message);
      }
      return Result.Ok(null);
    }
    if (file.type === FileType.File) {
      await this.delete_file(file);
      return Result.Ok(null);
    }
    await this.delete_folder(file);
    return Result.Ok(null);
  }
  /** 重命名（文件/文件夹），并重置解析结果 */
  async rename_file(file: { file_id: string; type: FileType }, values: { name: string }) {
    const { name } = values;
    const r = await this.client.rename_file(file.file_id, name);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    await this.store.prisma.file.updateMany({
      where: {
        id: file.file_id,
      },
      data: {
        name,
      },
    });
    if (file.type === FileType.File) {
      await this.store.prisma.parsed_episode.updateMany({
        where: {
          file_id: file.file_id,
        },
        data: {
          file_name: name,
          can_search: 1,
          episode_id: null,
        },
      });
      await this.store.prisma.parsed_movie.updateMany({
        where: {
          file_id: file.file_id,
        },
        data: {
          file_name: name,
          can_search: 1,
          movie_id: null,
        },
      });
    }
    if (file.type === FileType.Folder) {
      await this.store.prisma.bind_for_parsed_tv.updateMany({
        where: {
          file_id_link_resource: file.file_id,
        },
        data: {
          file_name_link_resource: name,
        },
      });
      await this.store.prisma.parsed_season.updateMany({
        where: {
          file_id: file.file_id,
        },
        data: {
          file_name: name,
          season_id: null,
        },
      });
      await this.store.prisma.parsed_tv.updateMany({
        where: {
          file_id: file.file_id,
        },
        data: {
          file_name: name,
          tv_id: null,
        },
      });
    }
    return Result.Ok(null);
  }

  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
}

export async function clear_expired_files_in_drive(values: {
  drive_id: string;
  user: User;
  store: DatabaseStore;
  on_print?: (node: ArticleLineNode) => void;
}) {
  const { user, drive_id, store, on_print } = values;
  const d_res = await Drive.Get({ id: drive_id, store, user });
  if (d_res.error) {
    return Result.Err(d_res.error.message);
  }
  const drive = d_res.data;

  const where: ModelQuery<"file"> = {
    drive_id: drive.id,
    user_id: user.id,
  };
  const count = await store.prisma.file.count({ where });
  if (on_print) {
    on_print(Article.build_line(["共", String(count), "条记录"]));
  }
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.file.findMany({
        where,
        ...extra,
      });
    },
    async handler(item, index) {
      const prefix = `[${item.name}]`;
      const res = await drive.client.fetch_file(item.file_id);
      if (on_print) {
        on_print(Article.build_line([prefix, `第 ${index + 1}`]));
      }
      if (res.error) {
        if (res.error.message.includes("file not exist")) {
          if (on_print) {
            on_print(Article.build_line([prefix, "删除云盘文件", item.name]));
            on_print(Article.build_line([item.id]));
            on_print(Article.build_line([item.file_id]));
            on_print(Article.build_line([""]));
          }
          // await drive.delete_file({ file_id: item.file_id }, { ignore_drive_file: true });
        }
        return;
      }
      const { name, content_hash, size } = res.data;
      const payload: Partial<FileRecord> = {};
      if (!item.md5) {
        payload.md5 = content_hash;
      }
      if (!item.size) {
        payload.size = size;
      }
      if (item.name !== name) {
        payload.name = name;
      }
      if (Object.keys(payload).length === 0) {
        return;
      }
      await store.prisma.file.update({
        where: {
          id: item.id,
        },
        data: payload,
      });
    },
  });
  return Result.Ok(null);
}
