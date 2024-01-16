/**
 * @file 资源同步任务
 */
import type { Handler } from "mitt";
import dayjs from "dayjs";

import { BaseDomain } from "@/domains/base";
import { DifferEffect, DiffTypes, FolderDiffer } from "@/domains/folder_differ";
import { Folder } from "@/domains/folder";
import { Article, ArticleCardNode, ArticleLineNode, ArticleSectionNode, ArticleTextNode } from "@/domains/article";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { DatabaseStore } from "@/domains/store";
import { ResourceSyncTaskRecord } from "@/domains/store/types";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { Result } from "@/types";
import { is_video_file, r_id, sleep } from "@/utils";
import { FileType } from "@/constants";

enum Events {
  /** 新增文件 */
  File,
  /** 输出日志 */
  Print,
  /** 同步完成 */
  Finish,
  Error,
}
type TheTypesOfEvents = {
  [Events.File]: { name: string; parent_paths: string; type: FileType };
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.Finish]: void;
  [Events.Error]: Error;
};
type ResourceSyncTaskProps = {
  task: ResourceSyncTaskRecord;
  user: User;
  drive: Drive;
  store: DatabaseStore;
  client: AliyunDriveClient;
  TMDB_TOKEN?: string;
  assets?: string;
  wait_complete?: boolean;
  ignore_invalid?: boolean;
  on_file?: (v: { name: string; parent_paths: string; type: FileType }) => void;
  on_print?: (v: ArticleLineNode | ArticleSectionNode) => void;
  on_finish?: () => void;
  on_error?: (error: Error) => void;
};

export class ResourceSyncTask extends BaseDomain<TheTypesOfEvents> {
  static async Get(
    options: { id: string } & {
      user: User;
      store: DatabaseStore;
    } & Pick<
        ResourceSyncTaskProps,
        "assets" | "wait_complete" | "ignore_invalid" | "on_file" | "on_print" | "on_finish" | "on_error"
      >
  ) {
    const {
      id,
      user,
      store,
      assets,
      wait_complete,
      ignore_invalid = false,
      on_file,
      on_finish,
      on_print,
      on_error,
    } = options;
    if (!user.settings.tmdb_token) {
      return Result.Err("缺少 TMDB_TOKEN");
    }
    if (!assets) {
      return Result.Err("缺少静态资源目录");
    }
    const sync_task = await store.prisma.resource_sync_task.findFirst({
      where: {
        id,
        user_id: user.id,
      },
    });
    if (sync_task === null) {
      return Result.Err("没有匹配的同步任务记录");
    }
    if (!ignore_invalid && sync_task.invalid) {
      const tip = "该更新已失效，请重新绑定更新";
      return Result.Err(tip);
    }
    const { drive_id } = sync_task;
    const drive_res = await Drive.Get({ id: drive_id, user, store });
    if (drive_res.error) {
      return Result.Err(drive_res.error);
    }
    const drive = drive_res.data;
    if (drive.profile.root_folder_id === null || drive.profile.root_folder_name === null) {
      return Result.Err("请先设置云盘索引根目录");
    }
    return Result.Ok(
      new ResourceSyncTask({
        task: sync_task,
        user,
        drive,
        store,
        wait_complete,
        assets,
        client: drive.client,
        on_file,
        on_print,
        on_finish,
        on_error,
      })
    );
  }
  static async NewWithURL(values: {
    url: string;
    code?: string;
    resource_file_id: string;
    resource_file_name: string;
  }) {}

  /** 任务信息 */
  profile: ResourceSyncTaskRecord;
  user: ResourceSyncTaskProps["user"];
  drive: ResourceSyncTaskProps["drive"];
  client: AliyunDriveClient;
  store: ResourceSyncTaskProps["store"];
  TMDB_TOKEN: ResourceSyncTaskProps["TMDB_TOKEN"];
  assets: ResourceSyncTaskProps["assets"];

  need_stop = false;
  differ: null | FolderDiffer = null;

  constructor(options: Partial<{}> & ResourceSyncTaskProps) {
    super();

    const { user, drive, store, task, client, TMDB_TOKEN, assets, on_file, on_print, on_finish, on_error } = options;
    this.profile = task;
    this.store = store;
    this.user = user;
    this.drive = drive;
    this.TMDB_TOKEN = TMDB_TOKEN;
    this.assets = assets;
    this.client = client;
    if (on_file) {
      this.on_file(on_file);
    }
    if (on_print) {
      this.on_print(on_print);
    }
    if (on_finish) {
      this.on_finish(on_finish);
    }
    if (on_error) {
      this.on_error(on_error);
    }
  }
  async run() {
    const { profile, client, store } = this;
    const { id, url, file_id, file_id_link_resource, file_name_link_resource, invalid, pwd } = profile;
    // const { file_id: target_folder_id, file_name: target_folder_name } = parsed_tv;
    // const drive_id = this.drive.id;
    if (invalid) {
      const tip = "该更新已失效，请重新绑定更新";
      this.emit(Events.Print, Article.build_line([tip]));
      this.emit(Events.Error, new Error(tip));
      return Result.Err(tip);
    }
    const r1 = await client.fetch_share_profile(url, { code: pwd, force: true });
    if (r1.error) {
      if (["share_link is cancelled by the creator"].includes(r1.error.message)) {
        await store.prisma.resource_sync_task.update({
          where: {
            id,
          },
          data: {
            invalid: 1,
          },
        });
        const tip = "分享资源失效，请关联新分享资源";
        this.emit(
          Events.Print,
          new ArticleSectionNode({
            children: [
              new ArticleLineNode({
                children: [
                  new ArticleTextNode({
                    text: tip,
                  }),
                ],
              }),
              new ArticleLineNode({
                children: [
                  new ArticleCardNode({
                    value: {
                      task_id: profile.id,
                    },
                  }),
                ],
              }),
            ],
          })
        );
        this.emit(Events.Error, new Error(tip));
        return Result.Err(tip);
      }
      const tip = "获取分享资源信息失败";
      this.emit(Events.Print, Article.build_line([tip, r1.error.message]));
      this.emit(Events.Error, new Error(tip));
      return Result.Err(r1.error);
    }
    const { share_id } = r1.data;
    const prev_folder = new Folder(file_id_link_resource, {
      name: file_name_link_resource,
      client,
    });
    const folder = new Folder(file_id, {
      // 这里本应该用 file_name，但是很可能分享文件的名字改变了，但我还要认为它没变。
      // 比如原先名字是「40集更新中」，等更新完了，就变成「40集已完结」，而我已开始存的名字是「40集更新中」。
      // 后面在索引文件的时候，根本找不到「40集已完结」这个名字，所以继续用旧的「40集更新中」
      name: file_name_link_resource,
      client: {
        fetch_files: async (file_id: string, options: Partial<{ marker: string; page_size: number }> = {}) => {
          return client.fetch_shared_files(file_id, {
            ...options,
            share_id,
          });
        },
      },
    });
    const ignore_files = this.user.get_ignore_files();
    const differ = new FolderDiffer({
      folder,
      prev_folder,
      unique_key: "name",
      filter(file) {
        const file_paths = [file.parent_paths, file.name].join("/");
        if (ignore_files.includes(file_paths)) {
          return false;
        }
        return true;
      },
      on_print: (node) => {
        this.emit(Events.Print, node);
      },
    });
    this.differ = differ;
    await differ.run();
    if (this.need_stop) {
      this.emit(Events.Print, Article.build_line(["中止任务"]));
      return Result.Ok(null);
    }
    await this.consume_effects_for_shared_file(differ.effects);
    this.emit(Events.Print, Article.build_line(["完成资源同步"]));
    return Result.Ok(differ.effects);
  }
  /**
   * 执行 FolderDiffer 生成的 effect
   */
  async consume_effects_for_shared_file(effects: DifferEffect[]) {
    const { profile, store, client } = this;
    const { url } = profile;
    const user_id = this.user.id;
    const drive_id = this.drive.id;
    //     log("应用 diff 的结果，共", effects.length, "个");
    // const errors: Error[] = [];
    for (let i = 0; i < effects.length; i += 1) {
      if (this.need_stop) {
        return Result.Ok(null);
      }
      const effect = effects[i];
      const { type: effect_type, payload } = effect;
      const { id: shared_file_id, name, type, parents, prev_folder } = payload;
      const parent_paths = parents.map((f) => f.name).join("/");
      const prefix = `${parent_paths}/${name}`;
      //       log(`[${prefix}]`, "是", effect_type === DiffTypes.Deleting ? "删除" : "新增");
      if (effect_type === DiffTypes.Deleting) {
        // log(`[${prefix}]`, "删除文件", shared_file_id);
        // 如果是转存，要同时删除云盘和本地数据库记录
        // await store.prisma.file.deleteMany({ where: { file_id } });
        continue;
      }
      if (effect_type === DiffTypes.Adding) {
        if (type === "file" && !is_video_file(name)) {
          //   log(`[${prefix}]`, "非视频文件，跳过");
          continue;
        }
        if (type === "folder") {
          //   log(`[${prefix}]`, "新增文件夹");
          // const r = await store.add_file({
          //   file_id: shared_file_id,
          //   name,
          //   type: FileType.Folder,
          //   parent_file_id: parents[parents.length - 1].file_id,
          //   parent_paths,
          //   drive_id,
          //   user_id,
          // });
          // if (r.error) {
          //   this.emit(
          //     Events.Print,
          //     new ArticleLineNode({
          //       children: [
          //         new ArticleTextNode({
          //           text: `新增文件夹 '${prefix}' 失败`,
          //         }),
          //         new ArticleTextNode({
          //           text: r.error.message,
          //         }),
          //       ],
          //     })
          //   );
          // }
          // continue;
        }
        // 避免添加后，还没有索引云盘，本地数据库没有，导致重复转存文件到云盘
        const existing_tmp_file = await store.prisma.tmp_file.findFirst({
          where: {
            name,
            parent_paths,
            user_id,
            drive_id,
          },
        });
        if (existing_tmp_file) {
          this.emit(Events.Print, Article.build_line([`「${prefix}」已经在云盘中`]));
          continue;
        }
        const r1 = await client.save_shared_files({
          url,
          file_id: shared_file_id,
          target_file_id: prev_folder.id,
        });
        if (r1.error) {
          this.emit(
            Events.Print,
            Article.build_line([`转存文件「${shared_file_id}」到云盘文件夹「${prev_folder.id}」失败`, r1.error.message])
          );
          continue;
        }
        // 这里的「临时文件」之所以没有 file_id，是因为转存到云盘后，才生成了 file_id，上面的 file_id 是分享资源的，不是转存到云盘后的
        // const full_parent_paths = [this.drive.profile.root_folder_name, parent_paths].filter(Boolean).join("/");
        this.emit(Events.File, {
          name,
          parent_paths,
          type: type === "file" ? FileType.File : FileType.Folder,
        });
        await sleep(3000);
        const drive_file_existing = await this.drive.client.existing(this.drive.profile.root_folder_id!, name);
        if (!drive_file_existing.data) {
          this.emit(Events.Print, Article.build_line([`没有找到文件「${name}」`]));
          continue;
        }
        this.emit(Events.Print, Article.build_line([`转存文件「${name}」到云盘成功`]));
        await store.prisma.tmp_file.create({
          data: {
            id: r_id(),
            name,
            file_id: drive_file_existing.data.file_id,
            parent_paths,
            type: type === "file" ? FileType.File : FileType.Folder,
            user_id,
            drive_id,
          },
        });
      }
    }
    // if (errors.length !== 0) {
    //   return Result.Err(errors.map((e) => e.message).join("\n"));
    // }
    //     log("完成同步");
    return Result.Ok(null);
  }
  /**
   * 使用新的资源链接覆盖旧的
   */
  async override(values: { url: string; resource_file_id?: string; resource_file_name?: string }) {
    const store = this.store;
    const user = this.user;
    const { url, resource_file_id, resource_file_name } = values;
    const duplicated_sync_task = await store.prisma.resource_sync_task.findFirst({
      where: {
        url,
        OR: [
          {
            invalid: 0,
          },
        ],
        user_id: user.id,
      },
    });
    if (duplicated_sync_task) {
      return Result.Err(`该分享资源已关联文件夹`, 40001, {
        id: duplicated_sync_task.id,
      });
    }
    // 手动指定了要分享资源文件夹是哪个
    if (resource_file_id && resource_file_name) {
      await store.prisma.resource_sync_task.update({
        where: {
          id: this.profile.id,
        },
        data: {
          updated: dayjs().toISOString(),
          invalid: 0,
          url,
          file_id: resource_file_id,
          name: resource_file_name,
        },
      });
      return Result.Ok(null);
    }
    const drive_res = await Drive.Get({ id: this.profile.drive_id, user, store });
    if (drive_res.error) {
      return Result.Err(drive_res.error.message);
    }
    const drive = drive_res.data;
    await sleep(1000);
    const r1 = await drive.client.fetch_share_profile(url);
    if (r1.error) {
      return Result.Err(r1.error.message);
    }
    const { share_id } = r1.data;
    const files_res = await drive.client.fetch_shared_files("root", {
      share_id,
    });
    if (files_res.error) {
      return Result.Err(files_res.error.message);
    }
    const resource_files = files_res.data.items;
    if (resource_files.length === 0) {
      return Result.Err("该分享没有包含文件夹");
    }
    if (resource_files.length !== 1) {
      return Result.Err(
        "该分享包含多个文件夹，请手动选择要转存的文件夹",
        40004,
        resource_files.map((file) => {
          const { name, file_id, type } = file;
          return {
            name,
            file_id,
            type,
          };
        })
      );
    }
    const resource = resource_files[0];
    await store.prisma.resource_sync_task.update({
      where: {
        id: this.profile.id,
      },
      data: {
        updated: dayjs().toISOString(),
        invalid: 0,
        url,
        file_id: resource.file_id,
        name: resource.name,
      },
    });
    return Result.Ok(null);
  }
  stop() {
    this.need_stop = true;
    if (this.differ) {
      this.differ.stop();
    }
  }

  on_file(handler: Handler<TheTypesOfEvents[Events.File]>) {
    return this.on(Events.File, handler);
  }
  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
  on_finish(handler: Handler<TheTypesOfEvents[Events.Finish]>) {
    return this.on(Events.Finish, handler);
  }
  on_error(handler: Handler<TheTypesOfEvents[Events.Error]>) {
    return this.on(Events.Error, handler);
  }
}
