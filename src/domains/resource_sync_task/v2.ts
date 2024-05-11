/**
 * @file 资源同步任务
 */
import type { Handler } from "mitt";
import dayjs from "dayjs";

import { BaseDomain } from "@/domains/base";
import { DifferEffect, DiffTypes, FolderDiffer } from "@/domains/folder_differ/index";
import { Folder } from "@/domains/folder/index";
import { Article, ArticleLineNode, ArticleSectionNode, ArticleTextNode } from "@/domains/article/index";
import { User } from "@/domains/user/index";
import { DatabaseStore } from "@/domains/store/index";
import { Drive } from "@/domains/drive/index";
import { DriveClient } from "@/domains/clients/types";
import { Job, TaskTypes } from "@/domains/job";
import { Application } from "@/domains/application";
import { AliyunShareResourceClient } from "@/domains/clients/aliyun_resource/index";
import { DataStore, ResourceSyncTaskRecord } from "@/domains/store/types";
import { Result } from "@/types/index";
import { is_video_file, r_id, sleep } from "@/utils/index";
import { FileType, ResourceSyncTaskStatus } from "@/constants/index";

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
  profile: ResourceSyncTaskRecord;
  assets: string;
  wait_complete?: boolean;
  ignore_invalid?: boolean;
  user: User;
  store: DataStore;
  drive_client: DriveClient;
  resource_client: DriveClient;
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
    const { url, pwd, drive_id } = sync_task;
    // const drive_res = await Drive.Get({ id: drive_id, user, store });
    // if (drive_res.error) {
    //   return Result.Err(drive_res.error);
    // }
    // const drive = drive_res.data;
    // if (drive.profile.root_folder_id === null || drive.profile.root_folder_name === null) {
    //   return Result.Err("请先设置云盘索引根目录");
    // }
    const r2 = await AliyunShareResourceClient.Get({
      id: drive_id,
      url,
      code: pwd,
      ignore_invalid,
      user,
      store,
    });
    if (r2.error) {
      if (["share_link is cancelled by the creator", "share_link is forbidden"].includes(r2.error.message)) {
        await store.prisma.resource_sync_task.update({
          where: {
            id,
          },
          data: {
            invalid: 1,
          },
        });
        const tip = "分享资源失效，请关联新分享资源";
        return Result.Err(tip);
      }
      return Result.Err(r2.error.message);
    }
    return Result.Ok(
      new ResourceSyncTask({
        profile: sync_task,
        user,
        store,
        wait_complete,
        assets,
        drive_client: r2.data.client,
        resource_client: r2.data,
        on_file,
        on_print,
        on_finish,
        on_error,
      })
    );
  }
  /** 转存资源/创建资源同步任务 */
  static async Transfer(
    body: { url: string; pwd?: string | null; file_id: string; file_name: string; drive_id: string },
    extra: {
      user: User;
      app: Application<any>;
      store: DataStore;
    }
  ) {
    const { url, pwd, file_id, file_name, drive_id } = body;
    const { user, app, store } = extra;
    if (!url) {
      return Result.Err("缺少分享资源链接");
    }
    if (!file_id) {
      return Result.Err("请指定要转存的文件");
    }
    if (!file_name) {
      return Result.Err("请传入转存文件名称");
    }
    if (!drive_id) {
      return Result.Err("请指定转存到哪个网盘");
    }
    const drive_res = await Drive.Get({ id: drive_id, user, store });
    if (drive_res.error) {
      return Result.Err(drive_res.error.message);
    }
    const drive = drive_res.data;
    if (!drive.has_root_folder()) {
      return Result.Err("请先为云盘设置索引根目录");
    }
    const exiting_tmp_file = await store.prisma.tmp_file.findFirst({
      where: {
        name: file_name,
        drive_id,
        user_id: user.id,
      },
    });
    if (exiting_tmp_file) {
      return Result.Err("最近转存过同名文件");
    }
    const existing_file = await store.prisma.file.findFirst({
      where: {
        name: file_name,
        parent_paths: drive.profile.root_folder_name!,
        drive_id,
        user_id: user.id,
      },
    });
    if (existing_file) {
      return Result.Err("云盘内已有同名文件");
    }
    const job_res = await Job.New({
      unique_id: file_id,
      desc: `转存资源「${file_name}」到云盘「${drive.name}」`,
      type: TaskTypes.Transfer,
      user_id: user.id,
      app,
      store,
    });
    if (job_res.error) {
      return Result.Err(job_res.error.message);
    }
    const job = job_res.data;
    job.output.write_line(["开始转存"]);
    async function run(resource: { name: string; file_id: string; url: string; code?: string | null }) {
      const { url, code, file_id, name } = resource;
      drive.client.on_transfer_failed((error) => {
        job.output.write_line(["转存发生错误", error.message]);
      });
      drive.client.on_transfer_finish(async () => {
        job.output.write_line(["添加到待索引文件"]);
        await sleep(5000);
        const r = await drive.client.existing(drive.profile.root_folder_id!, name);
        if (r.error) {
          job.output.write_line(["搜索已转存文件失败", r.error.message]);
          return;
        }
        if (!r.data) {
          job.output.write_line(["转存后没有搜索到转存文件"]);
          return;
        }
        await store.prisma.tmp_file.create({
          data: {
            id: r_id(),
            name,
            file_id: r.data.file_id,
            parent_paths: drive.profile.root_folder_name ?? "",
            drive_id: drive.id,
            user_id: user.id,
          },
        });
        job.output.write_line(["创建同步任务"]);
        await store.prisma.resource_sync_task.create({
          data: {
            id: r_id(),
            url,
            pwd: code,
            file_id,
            name,
            status: ResourceSyncTaskStatus.WaitSetProfile,
            file_name_link_resource: name,
            file_id_link_resource: r.data.file_id,
            drive_id: drive.id,
            user_id: user.id,
          },
        });
      });
      (async () => {
        const e = await store.prisma.shared_file_in_progress.findFirst({
          where: {
            id: r_id(),
            url,
            user_id: user.id,
          },
        });
        if (e) {
          return;
        }
        await store.prisma.shared_file_in_progress.create({
          data: {
            id: r_id(),
            url,
            pwd: code,
            file_id,
            name,
            drive_id: drive.id,
            user_id: user.id,
          },
        });
      })();
      const r = await drive.client.save_multiple_shared_files({
        url,
        code,
        file_ids: [{ file_id }],
      });
      if (r.error) {
        job.output.write(
          new ArticleLineNode({
            children: ["转存失败", r.error.message].map((text) => new ArticleTextNode({ text })),
          })
        );
        job.finish();
        return;
      }
      job.output.write(
        new ArticleLineNode({
          children: ["转存成功"].map((text) => new ArticleTextNode({ text })),
        })
      );
      job.finish();
    }
    run({
      url,
      code: pwd,
      file_id,
      name: file_name,
    });
    return Result.Ok({
      job_id: job.id,
    });
  }

  /** 任务信息 */
  profile: ResourceSyncTaskRecord;
  user: User;
  // drive: Drive;
  drive_client: DriveClient;
  resource_client: DriveClient;
  store: DataStore;
  assets: string;

  need_stop = false;
  added_file_count = 0;
  differ: null | FolderDiffer = null;

  constructor(options: Partial<{}> & ResourceSyncTaskProps) {
    super();

    const { user, store, profile, resource_client, drive_client, assets, on_file, on_print, on_finish, on_error } =
      options;
    this.profile = profile;
    this.store = store;
    this.user = user;
    this.assets = assets;
    this.resource_client = resource_client;
    this.drive_client = drive_client;
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
    const { file_id, file_id_link_resource, file_name_link_resource, invalid } = this.profile;
    if (invalid) {
      const tip = "该更新已失效，请重新绑定更新";
      this.emit(Events.Print, Article.build_line([tip]));
      this.emit(Events.Error, new Error(tip));
      return Result.Err(tip);
    }
    const drive_folder = new Folder(file_id_link_resource, {
      name: file_name_link_resource,
      client: this.drive_client,
    });
    const share_resource_folder = new Folder(file_id, {
      // 这里本应该用 file_name，但是很可能分享文件的名字改变了，但我还要认为它没变。
      // 比如原先名字是「40集更新中」，等更新完了，就变成「40集已完结」，而我已开始存的名字是「40集更新中」。
      // 后面在索引文件的时候，根本找不到「40集已完结」这个名字，所以继续用旧的「40集更新中」
      name: file_name_link_resource,
      client: this.resource_client,
    });
    const ignore_files = this.user.get_ignore_files();
    const differ = new FolderDiffer({
      folder: share_resource_folder,
      prev_folder: drive_folder,
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
    const { profile, store, drive_client } = this;
    const { url } = profile;
    const user_id = this.user.id;
    const drive_id = this.drive_client.id;
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
      this.emit(
        Events.Print,
        Article.build_line([`「${prefix}」是 `, effect_type === DiffTypes.Deleting ? "删除" : "新增"])
      );
      if (effect_type === DiffTypes.Deleting) {
        // log(`[${prefix}]`, "删除文件", shared_file_id);
        // 如果是转存，要同时删除云盘和本地数据库记录
        await store.prisma.file.deleteMany({ where: { name, parent_paths } });
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
        const r1 = await drive_client.save_shared_files({
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
        this.added_file_count += 1;
        // await sleep(3000);
        // this.emit(Events.Print, Article.build_line(["client.existing", prev_folder.id, name]));
        // const drive_file_existing = await this.drive.client.existing(prev_folder.id, name);
        // if (!drive_file_existing.data) {
        //   this.emit(Events.Print, Article.build_line([`没有找到文件「${name}」`]));
        //   continue;
        // }
        this.emit(
          Events.Print,
          Article.build_line(["将同步目录记录下来，后面直接索引同步目录而非新增文件 ", prev_folder.id])
        );
        const e = await store.prisma.tmp_file.findFirst({
          where: {
            file_id: prev_folder.id,
          },
        });
        if (e) {
          continue;
        }
        await store.prisma.tmp_file.create({
          data: {
            id: r_id(),
            name: prev_folder.name,
            file_id: prev_folder.id,
            parent_paths: this.drive_client.root_folder?.name!,
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
  async override(values: { url: string; pwd?: string; resource_file_id?: string; resource_file_name?: string }) {
    const store = this.store;
    const { url, pwd, resource_file_id, resource_file_name } = values;
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
    await sleep(1000);
    const r2 = await AliyunShareResourceClient.Get({
      id: this.profile.drive_id,
      url,
      code: pwd,
      user: this.user,
      store,
    });
    if (r2.error) {
      // console.log('get resource client failed', r2.error.message, this.profile.drive_id);
      return Result.Err(r2.error.message);
    }
    const resource_client = r2.data;
    const files_res = await resource_client.fetch_files("root", {});
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
