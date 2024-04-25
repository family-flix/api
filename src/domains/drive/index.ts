/**
 * @file 云盘所有逻辑
 */
import dayjs from "dayjs";
import Joi from "joi";

import { AliyunDriveClient } from "@/domains/clients/alipan";
import { AliyunDrivePayload, AliyunDriveProfile } from "@/domains/clients/alipan/types";
import {
  Article,
  ArticleLineNode,
  ArticleListItemNode,
  ArticleListNode,
  ArticleSectionNode,
  ArticleTextNode,
} from "@/domains/article";
import { ModelParam, ModelQuery, DriveRecord, FileRecord, DataStore } from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { User } from "@/domains/user";
import { BaseDomain, Handler } from "@/domains/base";
import { DatabaseStore } from "@/domains/store";
import { FileType } from "@/constants";
import { Result, resultify } from "@/types";
import { parseJSONStr, r_id } from "@/utils";

import { DriveTypes } from "./constants";
import { parse_filename_for_video } from "@/utils/parse_filename_for_video";

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
  profile: {
    name: string;
    type: DriveTypes;
    root_folder_id: string | null;
    root_folder_name: string | null;
    total_size: number;
    used_size: number;
    drive_id: string;
    token_id: string;
  } & AliyunDriveProfile;
  client: AliyunDriveClient;
  user?: User;
  store: DataStore;
};

export class Drive extends BaseDomain<TheTypesOfEvents> {
  /** create drive */
  static async Get(values: { id: string; user?: User; store: DataStore }) {
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
    const { type, name, profile, used_size, total_size, root_folder_id, root_folder_name, drive_token_id } =
      drive_record;
    const r = parseJSONStr<AliyunDriveProfile>(profile);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { drive_id, ...rest } = r.data;
    // console.log("[DOMAIN]drive/index - Get", drive_id, type, drive_token_id);
    const client_res = await (async (): Promise<Result<AliyunDriveClient>> => {
      const r = await AliyunDriveClient.Get({ unique_id: drive_id, store });
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
          type: type ?? DriveTypes.AliyunBackupDrive,
          name,
          drive_id,
          token_id: drive_token_id,
          root_folder_id,
          root_folder_name,
          used_size: used_size ?? 0,
          total_size: total_size ?? 0,
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
    const { type, name, profile, total_size, used_size, root_folder_id, root_folder_name, drive_token_id } =
      drive_record;
    const r = parseJSONStr<AliyunDriveProfile>(profile);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { drive_id, ...rest } = r.data;
    // console.log("[DOMAIN]drive/index - Get", drive_id, type, drive_token_id);
    const client_res = await (async (): Promise<Result<AliyunDriveClient>> => {
      const r = await AliyunDriveClient.Get({ unique_id: drive_id, store });
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
          type: type ?? DriveTypes.AliyunBackupDrive,
          name,
          drive_id,
          token_id: drive_token_id,
          root_folder_id,
          root_folder_name,
          total_size: total_size ?? 0,
          used_size: used_size ?? 0,
          ...rest,
        },
        client: client_res.data,
        user,
        store,
      })
    );
  }
  static async Add(body: {
    type?: DriveTypes;
    payload: unknown;
    user: User;
    store: DatabaseStore;
    skip_ping?: boolean;
  }) {
    const { type = DriveTypes.AliyunBackupDrive, payload, user, store, skip_ping = false } = body;
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
        const client = new AliyunDriveClient({
          // 这里给一个空的是为了下面能调用 ping 方法
          id: drive_record_id,
          unique_id: String(drive_id),
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
            root_folder_id: root_folder_id || null,
            used_size: used_size || 0,
            total_size: total_size || 0,
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
        const { drive_id, unique_id } = payload as { drive_id: string; unique_id: string };
        // console.log("[DOMAIN]drive/index - before store.prisma.drive.findFirst", drive_id);
        const existing_drive = await store.prisma.drive.findFirst({
          where: {
            OR: [
              drive_id
                ? {
                    id: drive_id,
                  }
                : {},
              unique_id
                ? {
                    unique_id: String(unique_id),
                  }
                : {},
            ].filter((v) => Object.keys(v).length > 0),
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
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const { resource_drive_id, device_id, user_id, app_id, nick_name, user_name } = r.data;
        let _resource_drive_id = resource_drive_id;
        const r2 = parseJSONStr<{ access_token: string; refresh_token: string }>(drive_token.data);
        // console.log("[DOMAIN]drive/index - after r2");
        if (r2.error) {
          return Result.Err(r2.error.message);
        }
        const { access_token, refresh_token } = r2.data;
        if (!_resource_drive_id) {
          const client = new AliyunDriveClient({
            id: "",
            unique_id: String(drive_id),
            resource_drive_id: "",
            device_id,
            access_token,
            refresh_token,
            root_folder_id,
            store,
          });
          const d = await client.ping();
          if (d.data) {
            _resource_drive_id = d.data.resource_drive_id;
          }
        }
        if (!_resource_drive_id) {
          return Result.Err("没有资源盘");
        }
        const existing_resource_drive = await store.prisma.drive.findFirst({
          where: {
            unique_id: String(_resource_drive_id),
            user_id: user.id,
          },
        });
        if (existing_resource_drive) {
          return Result.Err("该资源盘已存在，请检查信息后重试", undefined, { id: existing_resource_drive.id });
        }
        const drive_record_id = r_id();
        const client = new AliyunDriveClient({
          id: drive_record_id,
          unique_id: _resource_drive_id,
          device_id,
          access_token,
          refresh_token,
          root_folder_id,
          resource_drive_id: null,
          store,
        });
        // console.log("[DOMAIN]drive/index - before store.prisma.drive.create");
        const created_drive = await store.prisma.drive.create({
          data: {
            id: drive_record_id,
            name: `资源盘/${name}`,
            avatar,
            type: DriveTypes.AliyunResourceDrive,
            unique_id: String(_resource_drive_id),
            profile: JSON.stringify({
              avatar,
              user_name,
              nick_name,
              app_id,
              drive_id: String(_resource_drive_id),
              device_id,
              user_id,
              backup_drive_id: drive_id,
            } as AliyunDriveProfile),
            root_folder_id: root_folder_id || null,
            used_size: used_size || 0,
            total_size: total_size || 0,
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
      drive: { id, name, root_folder_id, root_folder_name, used_size, total_size, drive_token_id, profile },
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
          used_size: used_size ?? 0,
          total_size: total_size ?? 0,
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
  user?: User;
  profile: DriveProps["profile"];
  client: AliyunDriveClient;
  store: DataStore;

  constructor(options: DriveProps) {
    super();

    const { id, type, profile, client, user, store } = options;
    this.name = profile.name;
    this.type = type;
    this.id = id;
    this.profile = profile;
    if (user) {
      this.user = user;
    }
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
    const child_files = await this.store.prisma.file.findMany({
      where: {
        parent_file_id: file_id,
      },
    });
    // const files_res = await this.store.find_files({
    // });
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
    this.emit(Events.Print, Article.build_line([`[${name}]`, "遍历子文件"]));
    for (let i = 0; i < child_files.length; i += 1) {
      await (async () => {
        const child = child_files[i];
        const { type, name, parent_paths } = child;
        this.emit(Events.Print, Article.build_line([`[${parent_paths}/${name}]`]));
        if (type === FileType.Folder) {
          this.emit(
            Events.Print,
            Article.build_line([`[${parent_paths}/${name}]`, "是文件夹，先删除子文件夹及字文件"])
          );
          await this.delete_folder(child);
          this.emit(Events.Print, Article.build_line([`[${parent_paths}/${name}]`, "子文件夹及字文件删除完毕"]));
          return;
        }
      })();
    }
    this.emit(Events.Print, Article.build_line([`删除文件夹 「${name}」 下的所有子文件/文件`]));
    try {
      await this.store.prisma.file.deleteMany({
        where: {
          file_id: {
            in: child_files.map((f) => f.file_id),
          },
        },
      });
      this.emit(Events.Print, Article.build_line(["删除关联的同步任务"]));
      const sync_tasks = await this.store.prisma.bind_for_parsed_tv.findMany({
        where: {
          file_id_link_resource: {
            in: child_files.map((f) => f.file_id),
          },
        },
      });
      if (sync_tasks.length) {
        this.emit(
          Events.Print,
          new ArticleSectionNode({
            children: [
              new ArticleListNode({
                children: sync_tasks.map(
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
      this.emit(Events.Print, Article.build_line(["删除关联的剧集源"]));
      const parsed_episodes = await this.store.prisma.parsed_episode.findMany({
        where,
      });
      if (parsed_episodes.length) {
        this.emit(
          Events.Print,
          new ArticleSectionNode({
            children: [
              new ArticleListNode({
                children: parsed_episodes.map(
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
      // // 删除关联的季
      // this.emit(Events.Print, Article.build_line(["删除关联的解析季"]));
      // const parsed_seasons = await this.store.prisma.parsed_season.findMany({
      //   where,
      // });
      // if (parsed_seasons.length) {
      //   this.emit(
      //     Events.Print,
      //     new ArticleSectionNode({
      //       children: [
      //         new ArticleListNode({
      //           children: parsed_seasons.map(
      //             (text) =>
      //               new ArticleListItemNode({
      //                 children: [text.season_number].map((text) => {
      //                   return new ArticleTextNode({ text });
      //                 }),
      //               })
      //           ),
      //         }),
      //       ],
      //     })
      //   );
      // }
      // await this.store.prisma.parsed_season.deleteMany({
      //   where,
      // });
      // 删除关联的电视剧
      this.emit(Events.Print, Article.build_line(["开始删除关联的解析电视剧结果"]));
      const parsed_tvs = await this.store.prisma.parsed_tv.findMany({
        where: {
          ...where,
          parsed_episodes: {
            none: {},
          },
        },
      });
      if (parsed_tvs.length) {
        this.emit(
          Events.Print,
          new ArticleSectionNode({
            children: [
              new ArticleListNode({
                children: parsed_tvs.map(
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
      this.emit(Events.Print, Article.build_line(["删除关联的解析电影结果"]));
      const parsed_movies = await this.store.prisma.parsed_movie.findMany({
        where,
      });
      if (parsed_movies.length) {
        this.emit(
          Events.Print,
          new ArticleSectionNode({
            children: [
              new ArticleListNode({
                children: parsed_movies.map(
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
      const subtitles = await this.store.prisma.subtitle.findMany({
        where,
      });
      if (subtitles.length) {
        this.emit(
          Events.Print,
          new ArticleSectionNode({
            children: [
              new ArticleListNode({
                children: parsed_movies.map(
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
      this.emit(Events.Print, Article.build_line(["删除起始文件夹", f.name, f.file_id]));
      await this.store.prisma.file.deleteMany({
        where: {
          file_id: {
            in: [f.file_id],
          },
        },
      });
      this.emit(Events.Print, Article.build_line(["开始删除云盘内文件"]));
      const r7 = await this.client.delete_file(file_id);
      if (r7.error) {
        this.emit(Events.Print, Article.build_line(["删除云盘文件失败，因为", r7.error.message]));
      }
      this.emit(Events.Print, Article.build_line(["完成删除"]));
      return Result.Ok(null);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  }
  /**
   * 删除云盘内的指定文件
   */
  async delete_file_in_drive(file_id: string) {
    const file = await this.store.prisma.file.findFirst({
      where: {
        file_id,
      },
    });
    if (!file) {
      await this.store.prisma.subtitle.deleteMany({
        where: {
          file_id,
        },
      });
      this.emit(Events.Print, Article.build_line(["直接删除还未索引的文件"]));
      const r = await this.client.delete_file(file_id);
      if (r.error) {
        this.emit(Events.Print, Article.build_line(["删除失败，因为", r.error.message]));
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
  async rename_file(file: { file_id: string; type?: FileType }, values: { name: string }) {
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
    await this.store.prisma.file.updateMany({
      where: {
        id: file.file_id,
      },
      data: {
        name,
      },
    });
    if (file.type === FileType.File) {
      // @todo 这里非常重要，当改变一个文件的名字时，应该怎么做？
      // 如果是电影改成了剧集，剧集改成电影，就应该删除原先的解析结果，再重新索引
      // 如果是季、名字、集数等信息改变，
      const existing_parsed_episode = await this.store.prisma.parsed_episode.findFirst({
        where: {
          file_id: file.file_id,
          user_id: this.user?.id,
        },
        include: {
          parsed_tv: true,
        },
      });
      if (existing_parsed_episode) {
        // 直接删掉，重新索引过程去更新它
        await this.store.prisma.parsed_episode.delete({
          where: {
            id: existing_parsed_episode.id,
          },
        });
        return Result.Ok(null);
      }
      const existing_parsed_movie = await this.store.prisma.parsed_movie.findFirst({
        where: {
          file_id: file.file_id,
          user_id: this.user?.id,
        },
      });
      if (existing_parsed_movie) {
        await this.store.prisma.parsed_movie.delete({
          where: {
            id: existing_parsed_movie.id,
          },
        });
        return Result.Ok(null);
      }
      return Result.Ok(null);
    }
    if (file.type === FileType.Folder) {
      await this.store.prisma.bind_for_parsed_tv.updateMany({
        where: {
          file_id_link_resource: file.file_id,
          user_id: this.user?.id,
        },
        data: {
          file_name_link_resource: name,
        },
      });
      const existing_parsed_tv = await this.store.prisma.parsed_tv.findFirst({
        where: {
          file_id: file.file_id,
          user_id: this.user?.id,
        },
      });
      if (existing_parsed_tv) {
        // 重命名一个文件夹，不能直接删除关联的解析结果？
        await this.store.prisma.parsed_episode.deleteMany({
          where: {
            parsed_tv_id: existing_parsed_tv.id,
          },
        });
        await this.store.prisma.parsed_tv.delete({
          where: {
            id: existing_parsed_tv.id,
          },
        });
      }
      return Result.Ok(null);
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
  store: DataStore;
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
          await store.prisma.file.delete({
            where: {
              id: item.id,
            },
          });
          await store.prisma.parsed_episode.deleteMany({
            where: {
              file_id: item.file_id,
            },
          });
          await store.prisma.parsed_movie.deleteMany({
            where: {
              file_id: item.file_id,
            },
          });
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
