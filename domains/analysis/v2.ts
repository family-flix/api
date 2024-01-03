/**
 * @file 云盘索引
 * 1. 遍历云盘分析文件名，获取到剧集、电影
 * 2. 将获取到的剧集和电影在 TMDB 上搜索海报、简介等信息
 */
import { BaseDomain, Handler } from "@/domains/base";
import { EpisodeFileProcessor } from "@/domains/file_processor/episodeV2";
import { MovieFileProcessor } from "@/domains/file_processor/movieV2";
import { MediaSearcher } from "@/domains/searcher/v2";
import { File, Folder } from "@/domains/folder";
import { EpisodeRecord, MovieRecord, ParsedMediaSourceRecord, SeasonRecord, TVRecord } from "@/domains/store/types";
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
import { FileType, ResourceSyncTaskStatus } from "@/constants";

import { need_skip_the_file_when_walk, get_diff_of_file } from "./utils";

enum Events {
  AddTV,
  AddSeason,
  AddEpisode,
  AddMovie,
  Print,
  Error,
  /** 进度改变 */
  Percent,
  /** 云盘遍历完成 */
  WalkCompleted,
  Finished,
}
type TheTypesOfEvents = {
  // [Events.AddTV]: TVRecord;
  // [Events.AddSeason]: SeasonRecord;
  [Events.AddEpisode]: ParsedMediaSourceRecord;
  [Events.AddMovie]: ParsedMediaSourceRecord;
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.Error]: Error;
  [Events.Percent]: number;
  [Events.WalkCompleted]: void;
  [Events.Finished]: void;
};
type DriveAnalysisProps = {
  user: User;
  drive: Drive;
  store: DatabaseStore;
  walker: FolderWalker;
  searcher: MediaSearcher;
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
    const walker = new FolderWalker({
      filename_rules: user.get_filename_rules(),
      on_print,
    });
    const r2 = await MediaSearcher.New({
      user,
      drive,
      // force,
      assets,
      store,
      on_season_added,
      on_episode_added,
      on_movie_added,
      on_print,
    });
    if (r2.error) {
      return Result.Err(r2.error);
    }
    const searcher = r2.data;
    const r = new DriveAnalysis({
      extra_scope,
      drive,
      store,
      user,
      walker,
      searcher,
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
  walker: FolderWalker;
  searcher: MediaSearcher;
  tmdb_token: string;

  need_stop = false;
  extra_scope?: string[];
  parsed_media_sources: ParsedMediaSourceRecord[] = [];
  assets: string;

  constructor(options: Partial<{}> & DriveAnalysisProps) {
    super();

    const {
      extra_scope,
      drive,
      store,
      user,
      walker,
      searcher,
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
    this.walker = walker;
    this.searcher = searcher;
    this.tmdb_token = tmdb_token;
    this.assets = assets;
    if (extra_scope) {
      this.extra_scope = extra_scope;
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
    const size_count = this.drive.profile.total_size || 0;
    let cur_size_count = 0;
    walker.on_file = async (file) => {
      // 这里是从云盘索引到的文件，所以 name 就是不包含路径的部分
      const { file_id, type, name, parent_paths, size = 0 } = file;
      cur_size_count += size;
      if (size_count !== 0) {
        const percent = (() => {
          const v = cur_size_count / size_count;
          if (v < 0.0001) {
            return 0.0001;
          }
          if (v >= 1) {
            return 1;
          }
          return Number(v.toFixed(4));
        })();
        // console.log("[DOMAIN]analysis/index - percent", `${(percent * 100).toFixed(2)}%`);
        this.emit(Events.Percent, percent);
      }
      await (async () => {
        // 创建同步任务
        if (type === "file") {
          return;
        }
        const sync_task = await this.store.prisma.resource_sync_task.findFirst({
          where: {
            file_name_link_resource: name,
            user_id: user.id,
          },
        });
        if (sync_task) {
          if (sync_task.status === ResourceSyncTaskStatus.WaitLinkFolder) {
            await this.store.prisma.resource_sync_task.update({
              where: {
                id: sync_task.id,
              },
              data: {
                file_id_link_resource: file_id,
                status: ResourceSyncTaskStatus.WaitSetProfile,
              },
            });
            this.emit(Events.Print, Article.build_line([`[${name}]`, "建立同步任务成功"]));
          }
          // this.emit(Events.Print, Article.build_line([`[${name}]`, "已存在同名同步任务"]));
          return;
        }
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
    walker.on_episode = async (parsed) => {
      const { tv, episode } = parsed;
      const processor = new EpisodeFileProcessor({
        episode: parsed,
        user,
        drive,
        store,
        on_print: (v) => {
          this.emit(Events.Print, v);
        },
      });
      this.emit(
        Events.Print,
        Article.build_line([
          "解析出剧集 ",
          [tv.name || tv.original_name, episode.season_text, episode.episode_text].filter(Boolean).join("/"),
        ])
      );
      const r = await processor.run();
      if (r.error) {
        Article.build_line(["创建解析结果失败，因为", r.error.message]);
        return;
      }
      this.parsed_media_sources.push(r.data);
      this.emit(Events.AddEpisode, r.data);
      return;
    };
    walker.on_movie = async (parsed) => {
      const movie = parsed;
      const processor = new MovieFileProcessor({
        movie: parsed,
        user_id: user.id,
        drive_id: drive.id,
        store,
      });
      this.emit(Events.Print, Article.build_line(["解析出电影 ", movie.name || movie.original_name || ""]));
      const r = await processor.run();
      if (r.error) {
        Article.build_line(["创建解析结果失败，因为", r.error.message]);
        return;
      }
      console.log("2", r.data);
      this.parsed_media_sources.push(r.data);
      this.emit(Events.AddMovie, r.data);
      return;
    };
    searcher.on_percent((percent) => {
      this.emit(Events.Percent, percent);
    });

    // if (on_season_added) {
    //   this.on_add_season(on_season_added);
    // }
    // if (on_episode_added) {
    //   this.on_add_episode(on_episode_added);
    // }
    // if (on_movie_added) {
    //   this.on_add_movie(on_movie_added);
    // }
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
    options: Partial<{ force: boolean; before_search?: () => Promise<boolean> }> = {}
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
    const walker = this.walker;
    let direct_search = false;
    if (Array.isArray(files)) {
      if (files.length === 0) {
        direct_search = true;
        this.emit(Events.Print, Article.build_line(["没有要索引的文件，完成索引"]));
        this.emit(Events.Finished);
        return Result.Ok(null);
      }
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
    const added_parsed_tv_list: Record<
      string,
      {
        name: string;
        original_name: string | null;
      }
    > = {};
    const added_parsed_movie_list: Record<
      string,
      {
        name: string;
        original_name: string | null;
      }
    > = {};
    let episode_count = 0;
    let movie_count = 0;
    this.on(Events.AddEpisode, (data) => {
      const { name, original_name } = data;
      episode_count += 1;
      const k = [name, original_name].filter(Boolean).join("/");
      if (!added_parsed_tv_list[k]) {
        added_parsed_tv_list[k] = {
          name,
          original_name,
        };
        this.emit(Events.Print, Article.build_line(["解析出电视剧 ", name || original_name]));
      }
      return;
    });
    this.on(Events.AddMovie, (data) => {
      const { name, original_name } = data;
      movie_count += 1;
      const k = [name, original_name].filter(Boolean).join("/");
      if (!added_parsed_movie_list[k]) {
        added_parsed_movie_list[k] = {
          name,
          original_name,
        };
      }
      return;
    });
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
      if (episode_count + movie_count === 0) {
        this.emit(Events.Print, Article.build_line([`[${drive.name}]`, "遍历云盘没有查找到新增影视剧"]));
        return;
      }
      this.emit(
        Events.Print,
        Article.build_line([`[${drive.name}]`, "共找到", episode_count, "个剧集，", movie_count, "个电影"])
      );
    })();
    this.emit(Events.Percent, 0.5);
    if (this.need_stop) {
      return Result.Ok(null);
    }
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
    const files_prepare_search = (() => {
      const names = Object.values(added_parsed_movie_list)
        .concat(Object.values(added_parsed_tv_list))
        .map(({ name }) => ({ name }))
        .filter(({ name }) => !!name);
      const original_names = Object.values(added_parsed_movie_list)
        .concat(Object.values(added_parsed_tv_list))
        .map(({ original_name }) => ({ name: original_name }))
        .filter(({ name }) => !!name) as { name: string }[];
      const extra_names = this.extra_scope
        ? this.extra_scope.map((n) => {
            return { name: n };
          })
        : [];
      return [...names, ...original_names, ...extra_names];
    })();
    if (before_search) {
      const need_search = await before_search();
      if (!need_search) {
        this.emit(Events.Finished);
        return Result.Ok(null);
      }
    }
    // console.log("[DOMAIN]analysis/index - before searcher.run", files_prepare_search);
    await this.searcher.run(files_prepare_search);
    this.emit(Events.Percent, 1);
    // console.log("[DOMAIN]analysis/index - after searcher.run");
    this.emit(Events.Finished);
    return Result.Ok(null);
  }
  async run2(
    files: {
      file_id: string;
      name: string;
      type: FileType;
    }[],
    options: Partial<{ force: boolean; before_search?: () => Promise<boolean> }> = {}
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
    const walker = this.walker;
    let episode_count = 0;
    let movie_count = 0;
    this.on(Events.AddEpisode, () => {
      episode_count += 1;
      return;
    });
    this.on(Events.AddMovie, () => {
      movie_count += 1;
      return;
    });
    for (let i = 0; i < files.length; i += 1) {
      await (async () => {
        const file = files[i];
        const parent_paths_r = await client.fetch_parent_paths(file.file_id);
        if (parent_paths_r.error) {
          return;
        }
        const parents_and_cur = parent_paths_r.data.map((folder) => {
          return {
            id: folder.file_id,
            file_id: folder.file_id,
            file_name: folder.name,
            parent_file_id: folder.parent_file_id,
            name: "",
            original_name: "",
            season: "",
          };
        });
        const cur = parents_and_cur[parents_and_cur.length - 1];
        const parents = parents_and_cur.slice(0, -1);
        if (file.type === FileType.File) {
          const file = new File(cur.file_id, {
            client,
            // name: cur.name,
            parents,
          });
          await file.set_profile({
            file_id: cur.file_id,
            name: cur.file_name,
            parent_file_id: cur.parent_file_id,
          });
          await walker.run(file, parents);
          await this.searcher.run2([file.id]);
          return;
        }
        const folder = new Folder(cur.file_id, {
          client,
          name: cur.name,
        });
        await folder.profile();
        const r = await walker.run(folder, parents);
        this.emit(
          Events.Print,
          Article.build_line([
            `[${drive.name}]`,
            "完成一个文件夹遍历，共",
            episode_count,
            "个剧集，",
            movie_count,
            "个电影",
          ])
        );
        if (this.need_stop) {
          return;
        }
        episode_count = 0;
        movie_count = 0;
        if (this.parsed_media_sources.length) {
          if (before_search) {
            const need_search = await before_search();
            if (!need_search) {
              this.emit(Events.Finished);
              return Result.Ok(null);
            }
          }
          const file_ids = this.parsed_media_sources.map((source) => source.file_id);
          this.parsed_media_sources = [];
          await this.searcher.run2(file_ids);
        }
      })();
    }
    this.emit(Events.Percent, 1);
    this.emit(Events.Finished);
    return Result.Ok(null);
  }
  stop() {
    this.walker.stop();
    this.searcher.stop();
  }

  // on_add_tv(handler: Handler<TheTypesOfEvents[Events.AddTV]>) {
  //   return this.on(Events.AddTV, handler);
  // }
  // on_add_season(handler: Handler<TheTypesOfEvents[Events.AddSeason]>) {
  //   return this.on(Events.AddSeason, handler);
  // }
  on_add_episode(handler: Handler<TheTypesOfEvents[Events.AddEpisode]>) {
    return this.on(Events.AddEpisode, handler);
  }
  on_add_movie(handler: Handler<TheTypesOfEvents[Events.AddMovie]>) {
    return this.on(Events.AddMovie, handler);
  }
  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
  on_percent(handler: Handler<TheTypesOfEvents[Events.Percent]>) {
    return this.on(Events.Percent, handler);
  }
  on_walk_completed(handler: Handler<TheTypesOfEvents[Events.WalkCompleted]>) {
    return this.on(Events.WalkCompleted, handler);
  }
  on_finish(handler: Handler<TheTypesOfEvents[Events.Finished]>) {
    return this.on(Events.Finished, handler);
  }
  on_error(handler: Handler<TheTypesOfEvents[Events.Error]>) {
    return this.on(Events.Error, handler);
  }
}
