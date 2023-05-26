/**
 * @file 电视剧资源同步任务
 */
import { Handler } from "mitt";

import { BaseDomain } from "@/domains/base";
import { DifferEffect, DiffTypes, FolderDiffer } from "@/domains/folder_differ";
import { AliyunDriveFolder } from "@/domains/folder";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import {
  Article,
  ArticleCardNode,
  ArticleHeadNode,
  ArticleLineNode,
  ArticleSectionNode,
  ArticleTextNode,
} from "@/domains/article";
import { Job } from "@/domains/job";
import { Result } from "@/types";
import { ParsedTVRecord, FileSyncTaskRecord } from "@/store/types";
import { folder_client, store_factory } from "@/store";
import { is_video_file } from "@/utils";
import { FileType } from "@/constants";

enum Events {
  /** 输出日志 */
  Print,
  /** 同步完成 */
  Complete,
}
type TheTypesOfEvents = {
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.Complete]: void;
};
type ResourceSyncTaskProps = {
  task: FileSyncTaskRecord & { parsed_tv: ParsedTVRecord };
  user_id: string;
  drive_id: string;
  store: ReturnType<typeof store_factory>;
  job: Job;
  on_print?: (v: ArticleLineNode | ArticleSectionNode) => void;
};

export class ResourceSyncTask extends BaseDomain<TheTypesOfEvents> {
  static async Get(options: { id: string; user_id: string; store: ReturnType<typeof store_factory> }) {
    const { id, user_id, store } = options;
    const sync_task = await store.prisma.bind_for_parsed_tv.findFirst({
      where: {
        id,
        parsed_tv: {
          file_id: {
            not: null,
          },
        },
        user_id,
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
    const tv_name = (() => {
      if (tv) {
        return tv.profile.name || tv.profile.original_name;
      }
      return name || original_name;
    })();
    const job_res = await Job.New({ unique_id: id, desc: `同步电视剧 '${tv_name}' 新增影片`, user_id, store });
    if (job_res.error) {
      return Result.Err(job_res.error);
    }
    const job = job_res.data;
    const t = new ResourceSyncTask({
      task: sync_task,
      user_id,
      drive_id,
      job,
      store,
    });

    return Result.Ok(t);
  }

  store: ReturnType<typeof store_factory>;
  task: FileSyncTaskRecord & { parsed_tv: ParsedTVRecord };
  options: {
    user_id: string;
    drive_id: string;
  };

  client: AliyunDriveClient;
  job: Job;
  article: Article;
  wait_complete = false;

  constructor(options: Partial<{}> & ResourceSyncTaskProps) {
    super();

    const { user_id, drive_id, store, job, task, on_print } = options;
    this.task = task;
    this.store = store;
    this.options = {
      user_id,
      drive_id,
    };
    this.client = new AliyunDriveClient({ drive_id, store });
    this.job = job;
    this.article = job.output;
    if (on_print) {
      this.on_print(on_print);
    }
  }
  async run() {
    this.emit(
      Events.Print,
      this.article.write(
        new ArticleLineNode({
          children: [
            new ArticleHeadNode({
              level: 1,
              text: "开始执行同步任务",
            }),
          ],
        })
      )
    );

    const { task, client, store } = this;
    const { id, url, file_id, parsed_tv } = task;
    const { file_id: target_folder_id, file_name: target_folder_name } = parsed_tv;

    const { drive_id } = this.options;

    if (target_folder_id === null || target_folder_name === null) {
      this.emit(
        Events.Print,
        this.article.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: "该任务没有关联的云盘文件夹",
              }),
            ],
          })
        )
      );
      return Result.Err("没有关联的云盘文件夹");
    }
    const r1 = await client.fetch_share_profile(url, { force: true });
    if (r1.error) {
      if (["share_link is cancelled by the creator"].includes(r1.error.message)) {
        await store.update_sync_task(id, { invalid: 1 });
        this.emit(
          Events.Print,
          this.article.write(
            new ArticleSectionNode({
              children: [
                new ArticleLineNode({
                  children: [
                    new ArticleTextNode({
                      text: "分享资源失效，请关联新分享资源",
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
          )
        );
        return Result.Err("分享资源失效，请关联新分享资源");
      }
      this.emit(
        Events.Print,
        this.article.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: "获取分享资源信息失败",
              }),
              new ArticleTextNode({
                text: r1.error.message,
              }),
            ],
          })
        )
      );
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
        this.emit(Events.Print, this.article.write(node));
      },
    });
    const pending = (async () => {
      await differ.run();
      // await this.consume_effects_for_shared_file(differ.effects);
      this.emit(
        Events.Print,
        this.article.write(
          new ArticleLineNode({
            // type: "success",
            children: [
              new ArticleTextNode({
                text: "完成资源同步，开始索引新增影片",
              }),
            ],
          })
        )
      );
      // this.job.finish();
    })();
    if (this.wait_complete) {
      await pending;
    }
    return Result.Ok({ job_id: this.job.id });
  }
  /**
   * 执行 FolderDiffer 生成的 effect
   */
  async consume_effects_for_shared_file(effects: DifferEffect[]) {
    const { task, store, client } = this;
    const { id, url, file_id, parsed_tv } = task;
    const { user_id, drive_id } = this.options;
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
          const r = await store.add_file({
            file_id: shared_file_id,
            name,
            type: FileType.Folder,
            parent_file_id: parents[parents.length - 1].file_id,
            parent_paths,
          });
          if (r.error) {
            this.emit(
              Events.Print,
              this.article.write(
                new ArticleLineNode({
                  children: [
                    new ArticleTextNode({
                      text: `新增文件夹 '${prefix}' 失败`,
                    }),
                    new ArticleTextNode({
                      text: r.error.message,
                    }),
                  ],
                })
              )
            );
            //     log(`[${prefix}]`, "新增文件夹失败", r.error.message);
            // errors.push(new Error(`${prefix} 新增文件夹失败 ${r.error.message}`));
          }
          continue;
        }
        // log(`[${prefix}]`, "新增文件", parents.map((f) => f.name).join("/"), name);
        // 避免添加后，还没有索引云盘，本地数据库没有，导致重复转存文件到云盘
        const existing_res = await store.find_tmp_file({
          name,
          parent_paths,
          user_id,
        });
        if (existing_res.error) {
          //   log(`[${prefix}]`, "查找临时文件失败", existing_res.error.message);
          // errors.push(new Error(`${prefix} find_tmp_file failed ${existing_res.error.message}`));
          continue;
        }
        if (existing_res.data) {
          this.emit(
            Events.Print,
            this.article.write(
              new ArticleLineNode({
                children: [
                  new ArticleTextNode({
                    text: `文件夹 '${prefix}' 已经转存到云盘中`,
                  }),
                ],
              })
            )
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
            this.article.write(
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
            )
          );
          //   log(
          //     `[${prefix}]`,
          //     `转存文件 '${shared_file_id}' 到云盘文件夹 '${prev_folder.file_id}' 失败`,
          //     r1.error.message
          //   );
          // errors.push(new Error(`${prefix} save file to drive folder failed, because ${r1.error.message}`));
          continue;
        }
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
            this.article.write(
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
            )
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
  on_complete(handler: Handler<TheTypesOfEvents[Events.Complete]>) {
    return this.on(Events.Complete, handler);
  }
}
