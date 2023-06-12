/**
 * @file 电视剧资源同步任务
 */
import type { Handler } from "mitt";

import { BaseDomain } from "@/domains/base";
import { DifferEffect, DiffTypes, FolderDiffer } from "@/domains/folder_differ";
import { AliyunDriveFolder } from "@/domains/folder";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import {
  ArticleCardNode,
  ArticleHeadNode,
  ArticleLineNode,
  ArticleSectionNode,
  ArticleTextNode,
} from "@/domains/article";
import { DriveAnalysis } from "@/domains/analysis";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { DatabaseStore } from "@/domains/store";
import { ParsedTVRecord, FileSyncTaskRecord } from "@/domains/store/types";
import { Result } from "@/types";
import { folder_client } from "@/store";
import { is_video_file } from "@/utils";
import { FileType } from "@/constants";

enum Events {
  /** 输出日志 */
  Print,
  /** 同步完成 */
  Finish,
  Error,
}
type TheTypesOfEvents = {
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.Finish]: void;
  [Events.Error]: Error;
};
type ResourceSyncTaskProps = {
  task: FileSyncTaskRecord & { parsed_tv: ParsedTVRecord };
  user: User;
  drive: Drive;
  store: DatabaseStore;
  client: AliyunDriveClient;
  TMDB_TOKEN: string;
  assets?: string;
  on_print?: (v: ArticleLineNode | ArticleSectionNode) => void;
  on_finish?: () => void;
  on_error?: (error: Error) => void;
};

export class ResourceSyncTask extends BaseDomain<TheTypesOfEvents> {
  static async Get(
    options: { id: string } & {
      user: User;
      store: DatabaseStore;
      TMDB_TOKEN?: string;
      assets?: string;
      on_print?: (v: ArticleLineNode | ArticleSectionNode) => void;
      on_finish?: () => void;
      on_error?: (error: Error) => void;
    }
  ) {
    const { id, user, store, TMDB_TOKEN, assets, on_finish, on_print, on_error } = options;
    if (!TMDB_TOKEN) {
      return Result.Err("缺少 TMDB_TOKEN");
    }
    if (!assets) {
      return Result.Err("缺少静态资源目录");
    }
    const sync_task = await store.prisma.bind_for_parsed_tv.findFirst({
      where: {
        id,
        parsed_tv: {
          file_id: {
            not: null,
          },
        },
        user_id: user.id,
      },
      include: {
        parsed_tv: {
          include: {
            tv: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });
    if (sync_task === null) {
      return Result.Err("没有匹配的同步任务记录");
    }
    const { parsed_tv } = sync_task;
    const { name, original_name, tv, drive_id } = parsed_tv;
    // const tv_name = (() => {
    //   if (tv) {
    //     return tv.profile.name || tv.profile.original_name;
    //   }
    //   return name || original_name;
    // })();
    const drive_res = await Drive.Get({ id: drive_id, user_id: user.id, store });
    if (drive_res.error) {
      return Result.Err(drive_res.error);
    }
    const drive = drive_res.data;
    if (drive.profile.root_folder_id === null || drive.profile.root_folder_name === null) {
      return Result.Err("请先设置云盘索引根目录");
    }
    const t = new ResourceSyncTask({
      task: sync_task,
      user,
      drive,
      store,
      TMDB_TOKEN,
      assets,
      client: drive.client,
      on_print,
      on_finish,
      on_error,
    });
    return Result.Ok(t);
  }

  task: FileSyncTaskRecord & { parsed_tv: ParsedTVRecord };
  user: ResourceSyncTaskProps["user"];
  drive: ResourceSyncTaskProps["drive"];
  store: ResourceSyncTaskProps["store"];
  TMDB_TOKEN: ResourceSyncTaskProps["TMDB_TOKEN"];
  assets: ResourceSyncTaskProps["assets"];
  client: AliyunDriveClient;
  wait_complete = false;

  constructor(options: Partial<{}> & ResourceSyncTaskProps) {
    super();

    const { user, drive, store, task, client, TMDB_TOKEN, assets, on_print, on_finish, on_error } = options;
    this.task = task;
    this.store = store;
    this.user = user;
    this.drive = drive;
    this.TMDB_TOKEN = TMDB_TOKEN;
    this.assets = assets;
    this.client = client;
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
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: [
          new ArticleHeadNode({
            level: 3,
            text: "开始执行同步任务",
          }),
        ],
      })
    );
    const { task, client, store } = this;
    const { id, url, file_id, parsed_tv, invalid } = task;
    const { file_id: target_folder_id, file_name: target_folder_name } = parsed_tv;

    const drive_id = this.drive.id;

    if (invalid) {
      const tip = "该更新已失效，请重新绑定更新";
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: tip,
            }),
          ],
        })
      );
      this.emit(Events.Error, new Error(tip));
      return Result.Err(tip);
    }
    if (target_folder_id === null || target_folder_name === null) {
      const tip = "该任务没有关联的云盘文件夹";
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: tip,
            }),
          ],
        })
      );
      this.emit(Events.Error, new Error(tip));
      return Result.Err(tip);
    }
    const r1 = await client.fetch_share_profile(url, { force: true });
    if (r1.error) {
      if (["share_link is cancelled by the creator"].includes(r1.error.message)) {
        await store.update_sync_task(id, { invalid: 1 });
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
                      tv_id: parsed_tv.tv_id,
                      task_id: task.id,
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
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: tip,
            }),
            new ArticleTextNode({
              text: r1.error.message,
            }),
          ],
        })
      );
      this.emit(Events.Error, new Error(tip));
      return Result.Err(r1.error);
    }
    const { share_id } = r1.data;
    const prev_folder = new AliyunDriveFolder(target_folder_id, {
      name: target_folder_name,
      client: folder_client({ drive_id }, store),
    });
    const folder = new AliyunDriveFolder(file_id, {
      // 这里本应该用 file_name，但是很可能分享文件的名字改变了，但我还要认为它没变。
      // 比如原先名字是「40集更新中」，等更新完了，就变成「40集已完结」，而我已开始存的名字是「40集更新中」，在存文件的时候，根本找不到「40集已完结」这个名字
      // 所以继续用旧的「40集更新中」
      name: target_folder_name,
      client: {
        fetch_files: async (file_id: string, options: Partial<{ marker: string; page_size: number }> = {}) => {
          const r = await client.fetch_shared_files(file_id, {
            ...options,
            share_id,
          });
          if (r.error) {
            return r;
          }
          return r;
        },
      },
    });
    const differ = new FolderDiffer({
      folder,
      prev_folder,
      unique_key: "name",
      on_print: (node) => {
        this.emit(Events.Print, node);
      },
    });
    const pending = (async () => {
      await differ.run();
      await this.consume_effects_for_shared_file(differ.effects);
      this.emit(
        Events.Print,
        new ArticleLineNode({
          // type: "success",
          children: [
            new ArticleTextNode({
              text: "完成资源同步，开始索引新增影片",
            }),
          ],
        })
      );
      const analysis_res = await DriveAnalysis.New({
        drive: this.drive,
        user: this.user,
        store: this.store,
        tmdb_token: this.TMDB_TOKEN,
        assets: this.assets,
        on_print: (v) => {
          this.emit(Events.Print, v);
        },
        on_finish: () => {
          this.emit(Events.Finish);
        },
      });
      if (analysis_res.error) {
        this.emit(
          Events.Print,
          new ArticleLineNode({
            // type: "success",
            children: ["索引失败，中止该任务", analysis_res.error.message].map((text) => {
              return new ArticleTextNode({
                text,
              });
            }),
          })
        );
        this.emit(Events.Finish);
        return Result.Err(analysis_res.error);
      }
      const analysis = analysis_res.data;
      const files_res = await store.find_tmp_files({
        user_id: this.user.id,
        drive_id: this.drive.id,
      });
      if (files_res.error) {
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: ["获取转存的新文件失败", files_res.error.message].map((text) => {
              return new ArticleTextNode({
                text,
              });
            }),
          })
        );
        this.emit(Events.Finish);
        return Result.Err(files_res.error);
      }
      const { root_folder_name } = this.drive.profile;
      const files = files_res.data;
      analysis.run(
        files.map((file) => {
          const { name, parent_paths, type } = file;
          return {
            name: (() => {
              if (parent_paths) {
                return `${root_folder_name}/${parent_paths}/${name}`;
              }
              return `${root_folder_name}/${name}`;
            })(),
            type: type === FileType.File ? "file" : "folder",
          };
        })
      );
    })();
    if (this.wait_complete) {
      await pending;
    }
    return Result.Ok({});
  }
  /**
   * 执行 FolderDiffer 生成的 effect
   */
  async consume_effects_for_shared_file(effects: DifferEffect[]) {
    const { task, store, client } = this;
    const { id, url, file_id, parsed_tv } = task;
    const user_id = this.user.id;
    const drive_id = this.drive.id;
    //     log("应用 diff 的结果，共", effects.length, "个");
    const errors: Error[] = [];
    for (let i = 0; i < effects.length; i += 1) {
      const effect = effects[i];
      const { type: effect_type, payload } = effect;
      const { file_id: shared_file_id, name, type, parents, prev_folder } = payload;
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
        // log(`[${prefix}]`, "新增文件", parents.map((f) => f.name).join("/"), name);
        // 避免添加后，还没有索引云盘，本地数据库没有，导致重复转存文件到云盘
        const existing_res = await store.find_tmp_file({
          name,
          parent_paths,
          user_id,
          drive_id,
        });
        if (existing_res.error) {
          //   log(`[${prefix}]`, "查找临时文件失败", existing_res.error.message);
          // errors.push(new Error(`${prefix} find_tmp_file failed ${existing_res.error.message}`));
          continue;
        }
        if (existing_res.data) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: `文件夹 '${prefix}' 已经转存到云盘中`,
                }),
              ],
            })
          );
          //   log(`[${prefix}]`, "文件已存在临时文件列表，可能已转存到云盘中");
          // errors.push(new Error(`[${prefix}] 文件已存在临时文件列表，可能已转存到云盘中`));
          continue;
        }
        const r1 = await client.save_shared_files({
          url,
          file_id: shared_file_id,
          target_file_id: prev_folder.file_id,
        });
        if (r1.error) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: `转存文件 '${shared_file_id}' 到云盘文件夹 '${prev_folder.file_id}' 失败`,
                }),
                new ArticleTextNode({
                  text: r1.error.message,
                }),
              ],
            })
          );
          //   log(
          //     `[${prefix}]`,
          //     `转存文件 '${shared_file_id}' 到云盘文件夹 '${prev_folder.file_id}' 失败`,
          //     r1.error.message
          //   );
          // errors.push(new Error(`${prefix} save file to drive folder failed, because ${r1.error.message}`));
          continue;
        }
        // 这里的「临时文件」之所以没有 file_id，是因为转存到云盘后，才生成了 file_id，上面的 file_id 是分享资源的，不是转存到云盘后的
        const r4 = await store.add_tmp_file({
          name,
          parent_paths,
          type: type === "file" ? FileType.File : FileType.Folder,
          user_id,
          drive_id,
        });
        if (r4.error) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: `添加临时文件夹 ${prefix} 到云盘失败`,
                }),
                new ArticleTextNode({
                  text: r4.error.message,
                }),
              ],
            })
          );
          // errors.push(new Error(`${prefix} add tmp folder failed, because ${r4.error.message}`));
          //   log(`[${prefix}]`, "添加临时文件失败", r4.error.message);
          continue;
        }
      }
    }
    // if (errors.length !== 0) {
    //   return Result.Err(errors.map((e) => e.message).join("\n"));
    // }
    //     log("完成同步");

    return Result.Ok(null);
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
