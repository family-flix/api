/**
 * @file 云盘索引
 * 1. 遍历云盘分析文件名，获取到剧集、电影
 * 2. 将获取到的剧集和电影在 TMDB 上搜索海报、简介等信息
 */
import type { Handler } from "mitt";

import { BaseDomain } from "@/domains/base";
import { EpisodeFileProcessor } from "@/domains/file_processor/episode";
import { MovieFileProcessor } from "@/domains/file_processor/movie";
import { Folder } from "@/domains/folder";
import { MediaSearcher } from "@/domains/searcher";
import { EpisodeRecord, MovieRecord, SeasonRecord, TVRecord } from "@/domains/store/types";
import {
  Article,
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
import { FileType } from "@/constants";

import { need_skip_the_file_when_walk, get_diff_of_file } from "./utils";

enum Events {
  AddTV,
  AddSeason,
  AddEpisode,
  AddMovie,
  Print,
  Error,
  Finished,
}
type TheTypesOfEvents = {
  [Events.AddTV]: TVRecord;
  [Events.AddSeason]: SeasonRecord;
  [Events.AddEpisode]: EpisodeRecord;
  [Events.AddMovie]: MovieRecord;
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.Error]: Error;
  [Events.Finished]: void;
};
type DriveAnalysisProps = {
  user: User;
  drive: Drive;
  store: DatabaseStore;
  assets: string;
  tmdb_token: string;
  /** 当存在该值时会强制进行搜索 */
  extra_scope?: string[];
  on_season_added?: (season: SeasonRecord) => void;
  on_episode_added?: (episode: EpisodeRecord) => void;
  on_movie_added?: (movie: MovieRecord) => void;
  on_print?: (v: ArticleLineNode | ArticleSectionNode) => void;
  on_error?: (error: Error) => void;
  on_finish?: () => void;
};

export class DriveAnalysis extends BaseDomain<TheTypesOfEvents> {
  static async New(body: Partial<DriveAnalysisProps>) {
    const {
      extra_scope,
      drive,
      store,
      user,
      assets,
      on_season_added,
      on_episode_added,
      on_movie_added,
      on_print,
      on_finish,
      on_error,
    } = body;
    if (!user) {
      return Result.Err("缺少用户信息");
    }
    if (!user.settings.tmdb_token) {
      return Result.Err("缺少 TMDB_TOKEN");
    }
    if (!assets) {
      return Result.Err("缺少静态资源根路径");
    }
    if (!drive) {
      return Result.Err("缺少云盘信息");
    }
    if (!store) {
      return Result.Err("缺少数据库实例");
    }
    const r = new DriveAnalysis({
      extra_scope,
      drive,
      store,
      user,
      tmdb_token: user.settings.tmdb_token,
      assets,
      on_season_added,
      on_episode_added,
      on_movie_added,
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
  movie_count = 0;
  extra_scope?: string[];
  tmdb_token: string;
  assets: string;

  constructor(options: Partial<{}> & DriveAnalysisProps) {
    super();

    const {
      extra_scope,
      drive,
      store,
      user,
      tmdb_token,
      assets,
      on_season_added,
      on_episode_added,
      on_movie_added,
      on_print,
      on_finish,
      on_error,
    } = options;
    this.store = store;
    this.drive = drive;
    this.user = user;
    this.tmdb_token = tmdb_token;
    this.assets = assets;
    if (extra_scope) {
      this.extra_scope = extra_scope;
    }
    if (on_season_added) {
      this.on_add_season(on_season_added);
    }
    if (on_episode_added) {
      this.on_add_episode(on_episode_added);
    }
    if (on_movie_added) {
      this.on_add_movie(on_movie_added);
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
  async run(
    files?: {
      // 包含 root_folder_name 的完整路径
      name: string;
      type: string;
    }[],
    options: Partial<{ force: boolean; before_search?: () => void }> = {}
  ) {
    const { drive, user, store } = this;
    const { force = false, before_search } = options;
    const { client } = drive;
    if (!drive.has_root_folder()) {
      const tip = "未设置索引目录，请先设置索引目录";
      this.emit(Events.Print, Article.build_line([tip]));
      this.emit(Events.Error, new Error(tip));
      return Result.Err(tip);
    }
    const walker = new FolderWalker({
      filename_rules: this.user.get_filename_rules(),
      on_print: (v) => {
        this.emit(Events.Print, v);
      },
    });
    let direct_search = false;
    // console.log("[DOMAIN]analysis/index - before files.length === 0");
    if (Array.isArray(files)) {
      if (files.length === 0) {
        direct_search = true;
        this.emit(Events.Print, Article.build_line(["没有要索引的文件，完成索引"]));
        // console.log("[DOMAIN]analysis/index - after files.length === 0", drive.name);
        this.emit(Events.Finished);
        return Result.Ok(null);
      }
      // ${files.length ? " - 仅" + files.map((f) => f.name).join("、") : ""
      this.emit(Events.Print, Article.build_line([`[${drive.name}]`, "仅索引这些文件"]));
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
      const ignore_files = this.user.get_ignore_files().map((f) => [this.drive.profile.root_folder_name, f].join("/"));
      walker.filter = async (cur_file) => {
        if (ignore_files.includes([cur_file.parent_paths, cur_file.name].join("/"))) {
          return true;
        }
        let need_skip_file = true;
        for (let i = 0; i < cloned_files.length; i += 1) {
          const { name: target_file_name, type: target_file_type } = cloned_files[i];
          // console.log("检查是否要跳过", `${cur_file.parent_paths}/${cur_file.name}`);
          need_skip_file = need_skip_the_file_when_walk({
            target_file_name,
            target_file_type,
            cur_file,
          });
          if (need_skip_file === false) {
            break;
          }
        }
        return need_skip_file;
      };
    }
    // console.log("[DOMAIN]analysis/index - after files.length !== 0", drive.name);
    walker.on_error = (file) => {
      this.emit(
        Events.Print,
        Article.build_line([`[${drive.name}]`, "文件 「", file.name, "」 出现错误", file._position])
      );
      // log("索引云盘出现错误", file.name, file._position);
    };
    walker.on_warning = (file) => {
      // this.emit(
      //   Events.Print,
      //   new ArticleLineNode({
      //     children: [`[${drive.name}]`, "文件 「", file.name, "」 出现警告", file._position].map((text) => {
      //       return new ArticleTextNode({ text, color: "#f9f8fa" });
      //     }),
      //   })
      // );
      // log("索引云盘出现警告", file.name, file._position);
    };
    walker.on_file = async (file) => {
      // 这里是从云盘索引到的文件，所以 name 就是不包含路径的部分
      const { file_id, type, name, parent_paths } = file;
      // console.log("[DOMAIN]analysis/index - walker.on_file", name, file.md5);
      await (async () => {
        // 创建同步任务
        if (type === "file") {
          return;
        }
        const sync_task_res = await this.store.find_sync_task({
          file_name_link_resource: name,
          user_id: user.id,
        });
        if (sync_task_res.error) {
          return;
        }
        const sync_task = sync_task_res.data;
        if (sync_task) {
          // this.emit(Events.Print, Article.build_line([`[${name}]`, "已存在同名同步任务"]));
          return;
        }
        const save_record_res = await this.store.find_shared_file_save({
          name,
          user_id: user.id,
        });
        if (save_record_res.error) {
          return;
        }
        const save_record = save_record_res.data;
        if (!save_record) {
          return;
        }
        const r = await this.store.add_sync_task({
          url: save_record.url,
          file_id: save_record.file_id,
          name,
          file_id_link_resource: file_id,
          file_name_link_resource: name,
          in_production: 1,
          user_id: user.id,
          drive_id: drive.id,
        });
        if (r.error) {
          this.emit(Events.Print, Article.build_line([`[${name}]`, "建立同步任务失败", r.error.message]));
          return;
        }
        this.emit(Events.Print, Article.build_line([`[${name}]`, "建立同步任务成功"]));
      })();
      await (async () => {
        const existing = await store.prisma.file.findFirst({
          where: {
            file_id: file.file_id,
          },
        });
        if (!existing) {
          const r = await store.add_file({
            file_id,
            name,
            parent_file_id: file.parent_file_id,
            parent_paths,
            type: (() => {
              if (type === "file") {
                return FileType.File;
              }
              if (type === "folder") {
                return FileType.Folder;
              }
              return FileType.Unknown;
            })(),
            size: file.size,
            md5: file.md5,
            drive_id: drive.id,
            user_id: user.id,
          });
          if (r.error) {
            this.emit(Events.Print, Article.build_line([`[${name}]`, "新增文件失败", r.error.message]));
          }
          return;
        }
        const diff = get_diff_of_file(file, existing);
        // console.log("[DOMAIN]analysis/index - walker.on_file get diff", diff);
        if (diff === null) {
          return;
        }
        // this.emit(Events.Print, Article.build_line([`[${name}]`, "文件已存在且有变更字段，更新"]));
        await store.prisma.file.update({
          where: {
            id: existing.id,
          },
          data: diff,
        });
      })();
      await store.prisma.tmp_file.deleteMany({
        where: {
          name,
          parent_paths,
          user_id: this.user.id,
        },
      });
    };
    const added_parsed_tv_list: Record<
      string,
      {
        name: string;
        original_name: string;
      }
    > = {};
    const added_parsed_movie_list: Record<
      string,
      {
        name: string;
        original_name: string;
      }
    > = {};
    walker.on_episode = async (parsed) => {
      const { tv, episode } = parsed;
      //       const r = await check_need_stop(task_id);
      //       if (r && r.data) {
      //         need_stop = true;
      //         walker.stop = true;
      //         return;
      //       }
      // console.log("walker.on_episode", parsed.tv.name, parsed.episode.episode);
      const processor = new EpisodeFileProcessor({
        episode: parsed,
        user,
        drive,
        store,
        on_print: (v) => {
          this.emit(Events.Print, v);
        },
      });
      this.episode_count += 1;
      const k = [parsed.tv.name, parsed.tv.original_name].join("/");
      if (!added_parsed_tv_list[k]) {
        added_parsed_tv_list[k] = parsed.tv;
        this.emit(Events.Print, Article.build_line(["解析出电视剧 ", tv.name || tv.original_name]));
      }
      this.emit(
        Events.Print,
        Article.build_line([
          "解析出剧集 ",
          [tv.name || tv.original_name, episode.season_text, episode.episode_text].join("/"),
        ])
      );
      const r = await processor.run();
      if (r.error) {
        Article.build_line(["创建解析结果失败，因为", r.error.message]);
      }
      return;
    };
    walker.on_movie = async (parsed) => {
      const movie = parsed;
      // console.log("walker.on_movie", parsed.name, parsed.original_name);
      const processor = new MovieFileProcessor({
        movie: parsed,
        user_id: user.id,
        drive_id: drive.id,
        store,
      });
      this.movie_count += 1;
      const k = [parsed.name, parsed.original_name].join("/");
      if (!added_parsed_movie_list[k]) {
        added_parsed_movie_list[k] = parsed;
      }
      this.emit(Events.Print, Article.build_line(["解析出电影 ", movie.name || movie.original_name || ""]));
      await processor.run();
      return;
    };
    // @todo 如果希望仅索引一个文件夹，是否可以这里直接传目标文件夹，而不是每次都从根文件夹开始索引？
    // 因为要拿到一个文件的完整路径，才从根开始。如果能拿到指定文件的路径，就可以不从根开始
    const folder = new Folder(drive.profile.root_folder_id!, {
      client,
    });
    // console.log("[DOMAIN]analysis/index - before folder.profile()");
    if (!direct_search) {
      const r = await folder.profile();
      if (r.error) {
        this.emit(Events.Print, Article.build_line(["获取索引根目录失败", r.error.message]));
        this.emit(Events.Error, new Error("获取索引根目录失败"));
        // console.log("[DOMAIN]analysis/index - after 获取索引根目录失败");
        return Result.Err(r.error);
      }
      // console.log("[DOMAIN]analysis/index - before walker.detect");
      // @todo 如果 run 由于内部调用 folder.next() 报错，这里没有处理会导致一直 pending
      await walker.run(folder);
      // console.log("[DOMAIN]analysis/index - after walker.detect");
    }
    this.emit(Events.Print, Article.build_line([`[${drive.name}]`, "云盘文件查找完成"]));
    (() => {
      if (this.episode_count + this.movie_count === 0) {
        this.emit(Events.Print, Article.build_line([`[${drive.name}]`, "遍历云盘没有查找到新增影视剧"]));
        return;
      }
      this.emit(
        Events.Print,
        Article.build_line([`[${drive.name}]`, "共找到", this.episode_count, "个剧集，", this.movie_count, "个电影"])
      );
    })();
    this.emit(
      Events.Print,
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [
              new ArticleHeadNode({
                level: 3,
                text: "开始搜索影视剧信息",
              }),
            ],
          }),
        ],
      })
    );
    const r2 = await MediaSearcher.New({
      user,
      drive,
      force,
      assets: this.assets,
      store,
      on_season_added: (season) => {
        this.emit(Events.AddSeason, season);
      },
      on_episode_added: (episode) => {
        this.emit(Events.AddEpisode, episode);
      },
      on_movie_added: (movie) => {
        this.emit(Events.AddMovie, movie);
      },
      on_print: (v) => {
        this.emit(Events.Print, v);
      },
    });
    if (r2.error) {
      this.emit(Events.Print, Article.build_line([`[${drive.name}]`, "搜索剧集海报等信息失败", r2.error.message]));
      this.emit(Events.Error, r2.error);
      return Result.Err(r2.error);
    }
    const searcher = r2.data;
    const files_prepare_search = (() => {
      const names = Object.values(added_parsed_movie_list)
        .concat(Object.values(added_parsed_tv_list))
        .map(({ name }) => ({ name }))
        .filter(({ name }) => !!name);
      const original_names = Object.values(added_parsed_movie_list)
        .concat(Object.values(added_parsed_tv_list))
        .map(({ original_name }) => ({ name: original_name }))
        .filter(({ name }) => !!name);
      const extra_names = this.extra_scope
        ? this.extra_scope.map((n) => {
            return { name: n };
          })
        : [];
      return [...names, ...original_names, ...extra_names];
    })();
    if (before_search) {
      await before_search();
    }
    // console.log("[DOMAIN]analysis/index - before searcher.run", files_prepare_search);
    await searcher.run(files_prepare_search);
    // console.log("[DOMAIN]analysis/index - after searcher.run");
    this.emit(Events.Finished);
    return Result.Ok(null);
  }

  on_add_tv(handler: Handler<TheTypesOfEvents[Events.AddTV]>) {
    return this.on(Events.AddTV, handler);
  }
  on_add_season(handler: Handler<TheTypesOfEvents[Events.AddSeason]>) {
    return this.on(Events.AddSeason, handler);
  }
  on_add_episode(handler: Handler<TheTypesOfEvents[Events.AddEpisode]>) {
    return this.on(Events.AddEpisode, handler);
  }
  on_add_movie(handler: Handler<TheTypesOfEvents[Events.AddMovie]>) {
    return this.on(Events.AddMovie, handler);
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
