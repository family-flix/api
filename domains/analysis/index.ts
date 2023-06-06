/**
 * @file 云盘索引
 * 1. 遍历云盘分析文件名，获取到剧集、电影
 * 2. 将获取到的剧集和电影在 TMDB 上搜索海报、简介等信息
 */
import { Handler } from "mitt";

import { BaseDomain } from "@/domains/base";
import { EpisodeFileProcessor } from "@/domains/episode_file_processor";
import { AliyunDriveFolder } from "@/domains/folder";
import { MediaSearcher } from "@/domains/searcher";
import {
  ArticleCardNode,
  ArticleHeadNode,
  ArticleLineNode,
  ArticleListItemNode,
  ArticleListNode,
  ArticleSectionNode,
  ArticleTextNode,
} from "@/domains/article";
import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { DatabaseStore } from "@/domains/store";
import { FolderWalker } from "@/domains/walker";
import { Result } from "@/types";

import { need_skip_the_file_when_walk, adding_file_safely } from "./utils";

enum Events {
  Print,
  Error,
  Finished,
}
type TheTypesOfEvents = {
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.Error]: Error;
  [Events.Finished]: void;
};
type DriveAnalysisProps = {
  drive: Drive;
  user: User;
  store: DatabaseStore;
  assets: string;
  TMDB_TOKEN: string;
  on_print?: (v: ArticleLineNode | ArticleSectionNode) => void;
  /** 索引失败 */
  on_error?: (error: Error) => void;
  /** 索引成功 */
  on_finish?: () => void;
};

export class DriveAnalysis extends BaseDomain<TheTypesOfEvents> {
  static async New(body: Partial<DriveAnalysisProps>) {
    const { drive, store, user, TMDB_TOKEN, assets, on_print, on_finish, on_error } = body;
    if (!TMDB_TOKEN) {
      return Result.Err("缺少 TMDB_TOKEN");
    }
    if (!drive) {
      return Result.Err("缺少云盘信息");
    }
    if (!store) {
      return Result.Err("缺少数据库实例");
    }
    if (!assets) {
      return Result.Err("缺少静态资源根路径");
    }
    if (!user) {
      return Result.Err("缺少用户信息");
    }
    const r = new DriveAnalysis({
      drive,
      store,
      user,
      TMDB_TOKEN,
      assets,
      on_print,
      on_finish,
      on_error,
    });
    return Result.Ok(r);
  }

  store: DriveAnalysisProps["store"];
  drive: DriveAnalysisProps["drive"];
  user: DriveAnalysisProps["user"];

  need_stop = false;
  episode_count = 0;
  TMDB_TOKEN: string;
  assets: string;

  constructor(options: Partial<{}> & DriveAnalysisProps) {
    super();

    const { drive, store, user, TMDB_TOKEN, assets, on_print, on_finish, on_error } = options;
    this.store = store;
    this.drive = drive;
    this.user = user;
    this.TMDB_TOKEN = TMDB_TOKEN;
    this.assets = assets;
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

  async run(files?: { name: string; type: string }[]) {
    const { drive, user, store } = this;
    const {
      client,
      profile: { root_folder_name },
    } = drive;
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: [
          new ArticleHeadNode({
            level: 1,
            text: `索引云盘 '${drive.name}'`,
          }),
        ],
      })
    );
    if (!drive.has_root_folder()) {
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [
            new ArticleCardNode({
              value: {
                type: "set_root_folder",
                text: "未设置索引目录，请点击设置索引目录",
                drive_id: this.drive.id,
                name: this.drive.name,
              },
            }),
          ],
        })
      );
      // log(`[${drive_id}]`, "未设置索引目录，中止索引");
      this.emit(Events.Error, new Error("未设置索引目录"));
      return Result.Err("请先设置索引目录");
    }
    //     const { id: task_id } = add_async_task_res.data;
    const walker = new FolderWalker({
      on_print: (v) => {
        this.emit(Events.Print, v);
      },
    });
    //     let need_stop = false;
    if (files !== undefined && Array.isArray(files)) {
      if (files.length === 0) {
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: "没有要索引的文件，完成索引",
              }),
            ],
          })
        );
        this.emit(Events.Finished);
        return Result.Ok(null);
      }
      // ${files.length ? " - 仅" + files.map((f) => f.name).join("、") : ""
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [`[${drive.name}]`, "仅索引这些文件"].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [
            new ArticleListNode({
              children: files.map((file) => {
                const { name } = file;
                return new ArticleListItemNode({
                  children: [new ArticleTextNode({ text: name })],
                });
              }),
            }),
          ],
        })
      );
      // log(`[${drive_id}]`, "仅索引这些文件", files.length);
      let cloned_files = [...files];
      walker.filter = async (cur_file) => {
        let need_skip_file = true;
        for (let i = 0; i < cloned_files.length; i += 1) {
          const { name: target_file_name, type: target_file_type } = cloned_files[i];
          // log(`[${drive_id}]`, "检查是否要跳过", `${cur_file.parent_paths}/${cur_file.name}`, {
          //   target_file_name,
          //   target_file_type,
          //   cur_file,
          // });
          need_skip_file = need_skip_the_file_when_walk({
            target_file_name,
            target_file_type,
            cur_file,
          });
          if (need_skip_file === false) {
            break;
          }
        }
        if (need_skip_file) {
          // log(`[${drive_id}]`, `跳过${cur_file.parent_paths}/${cur_file.name}`);
        }
        return need_skip_file;
      };
    }
    walker.on_error = (file) => {
      // this.emit(
      //   Events.Print,
      //   new ArticleLineNode({
      //     children: [`[${drive._name}]`, "文件 ", file.name, " 出现错误 ", file._position].map((text) => {
      //       return new ArticleTextNode({ text });
      //     }),
      //   })
      // );
      // log("索引云盘出现错误", file.name, file._position);
    };
    walker.on_warning = (file) => {
      // this.emit(
      //   Events.Print,
      //   new ArticleLineNode({
      //     children: [`[${drive._name}]`, "文件 ", file.name, " 出现提示 ", file._position].map((text) => {
      //       return new ArticleTextNode({ text });
      //     }),
      //   })
      // );
      // log("索引云盘出现警告", file.name, file._position);
      // console.log("[]walk on warning", file.name);
    };
    walker.on_file = async (file) => {
      const { name, parent_paths } = file;
      // console.log('[]walker.on_file', name);
      await adding_file_safely(file, { user_id: user.id, drive_id: drive.id }, store);
      const clean_parent_paths = parent_paths.replace(new RegExp(`^${root_folder_name}/`), "");
      const tmp_file_res = await store.find_tmp_file({
        name,
        parent_paths: clean_parent_paths,
        // drive_id: drive.id,
        // user_id: user.id,
      });
      if (tmp_file_res.error) {
        // console.log("[]walker.on_file - find tmp_file failed", tmp_file_res.error.message);
        return;
      }
      const tmp_file = tmp_file_res.data;
      if (!tmp_file) {
        // console.log("[]walker.on_file - find tmp_file failed not found", name, clean_parent_paths);
        return;
      }
      const r2 = await store.delete_tmp_file({
        id: tmp_file.id,
      });
      if (r2.error) {
        // console.log("[]walker.on_file - delete tmp_file failed", r2.error.message);
      }
    };
    //     let count = 0;
    walker.on_episode = async (parsed) => {
      //       const r = await check_need_stop(task_id);
      //       if (r && r.data) {
      //         need_stop = true;
      //         walker.stop = true;
      //         return;
      //       }
      const processor = new EpisodeFileProcessor({ episode: parsed, user_id: user.id, drive_id: drive.id, store });
      await processor.run();
      this.episode_count += 1;
      return;
    };
    walker.on_movie = async (parsed) => {
      // log("索引到电影", parsed);
      // const r = await check_need_stop(async_task_id);
      // if (r && r.data) {
      //   need_stop = true;
      //   walker.stop = true;
      //   return;
      // }
      // await adding_episode_when_walk(tasks, { user_id, drive_id }, store);
      // return;
    };
    // @todo 如果希望仅索引一个文件夹，是否可以这里直接传目标文件夹，而不是每次都从根文件夹开始索引？
    const folder = new AliyunDriveFolder(drive.profile.root_folder_id!, {
      client,
    });
    const r = await folder.profile();
    if (r.error) {
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: ["获取索引根目录失败", r.error.message].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      this.emit(Events.Error, new Error("获取索引根目录失败"));
      return Result.Err(r.error);
    }
    // @todo 如果 detect 由于内部调用 folder.next() 报错，这里没有处理会导致一直 pending
    await walker.detect(folder);
    if (this.episode_count === 0) {
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [`[${drive.name}]`, "查找到视频文件数为 0。结束索引"].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      this.emit(Events.Finished);
      // log(`[${drive_id}]`, "没有索引到任一视频文件，完成索引");

      //       await store.update_task(task_id, {
      //         status: TaskStatus.Finished,
      //       });
      return Result.Ok(null);
    }
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: [`[${drive.name}]`, "云盘文件查找完成"].map((text) => {
          return new ArticleTextNode({ text });
        }),
      })
    );
    this.emit(
      Events.Print,
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [
              new ArticleHeadNode({
                level: 3,
                text: "开始搜索电视剧信息",
              }),
            ],
          }),
        ],
      })
    );
    const r2 = await MediaSearcher.New({
      user_id: user.id,
      drive_id: drive.id,
      token: this.TMDB_TOKEN,
      store,
      assets: this.assets,
      on_print: (v) => {
        this.emit(Events.Print, v);
      },
    });
    if (r2.error) {
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [`[${drive.name}]`, "搜索剧集海报等信息失败", r2.error.message].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      this.emit(Events.Error, r2.error);
      return Result.Err(r2.error);
    }
    const searcher = r2.data;
    await searcher.run();
    this.emit(Events.Finished);
  }

  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
  on_finish(handler: Handler<TheTypesOfEvents[Events.Finished]>) {
    return this.on(Events.Finished, handler);
  }
  on_error(handler: Handler<TheTypesOfEvents[Events.Error]>) {
    return this.on(Events.Error, handler);
  }
}
