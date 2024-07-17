/**
 * @file 云盘索引
 * 1. 遍历云盘分析文件名，获取到剧集、电影
 * 2. 将获取到的剧集和电影在 TMDB 上搜索海报、简介等信息
 */
import { BaseDomain, Handler } from "@/domains/base";
import { EpisodeFileProcessor } from "@/domains/file_processor/episode";
import { MovieFileProcessor } from "@/domains/file_processor/movie";
import { MediaProfileProcessor } from "@/domains/file_processor/media_profile";
import { MediaSearcher } from "@/domains/searcher/v2";
import { File, Folder } from "@/domains/folder/index";
import { DataStore, ParsedMediaSourceRecord } from "@/domains/store/types";
import { Article, ArticleHeadNode, ArticleLineNode, ArticleSectionNode } from "@/domains/article/index";
import { Drive } from "@/domains/drive/v2";
import { User } from "@/domains/user/index";
import { FolderWalker } from "@/domains/walker/index";
import { FileType } from "@/constants/index";
import { Result } from "@/domains/result/index";

import { get_diff_of_file, need_skip_the_file_when_walk } from "./utils";

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
  [Events.AddEpisode]: ParsedMediaSourceRecord;
  [Events.AddMovie]: ParsedMediaSourceRecord;
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.Error]: Error;
  [Events.Percent]: number;
  [Events.WalkCompleted]: void;
  [Events.Finished]: void;
};
type DriveAnalysisProps = {
  /** 用来标志一次任务中索引到的所有解析结果 */
  unique_id?: string;
  assets: string;
  tmdb_token: string;
  /** 当存在该值时会强制进行搜索 */
  extra_scope?: string[];
  user: User;
  drive: Drive;
  store: DataStore;
  walker: FolderWalker;
  searcher: MediaSearcher;
  on_print?: (v: ArticleLineNode | ArticleSectionNode) => void;
  on_error?: (error: Error) => void;
  on_finish?: () => void;
};

export class DriveAnalysis extends BaseDomain<TheTypesOfEvents> {
  static async New(body: Partial<DriveAnalysisProps>) {
    const { unique_id, extra_scope, drive, store, user, assets, on_print, on_finish, on_error } = body;
    if (!user) {
      return Result.Err("缺少用户信息");
    }
    if (!user.settings.tmdb_token) {
      return Result.Err("缺少 tmdb_token");
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
      unique_id,
      assets,
      store,
      on_print,
    });
    if (r2.error) {
      return Result.Err(r2.error);
    }
    const searcher = r2.data;
    const r = new DriveAnalysis({
      unique_id,
      extra_scope,
      drive,
      store,
      user,
      walker,
      searcher,
      tmdb_token: user.settings.tmdb_token,
      assets,
      on_print,
      on_finish,
      on_error,
    });
    return Result.Ok(r);
  }

  unique_id?: string;
  tmdb_token: string;
  assets: string;
  extra_scope?: string[];

  need_stop = false;
  parsed_media_sources: ParsedMediaSourceRecord[] = [];

  store: DataStore;
  drive: Drive;
  user: User;
  walker: FolderWalker;
  searcher: MediaSearcher;

  constructor(options: Partial<{}> & DriveAnalysisProps) {
    super();

    const {
      unique_id,
      extra_scope,
      drive,
      store,
      user,
      walker,
      searcher,
      tmdb_token,
      assets,
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
    if (unique_id) {
      this.unique_id = unique_id;
    }
    if (extra_scope) {
      this.extra_scope = extra_scope;
    }

    // console.log("[DOMAIN]analysis/index - after files.length !== 0", drive.name);
    walker.on_error = (file) => {
      this.emit(
        Events.Print,
        Article.build_line([`[${drive.name}]`, "文件 「", file.name, "」 出现错误", file._position])
      );
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
        this.emit(Events.Percent, percent / 2);
      }
      await (async () => {
        const existing = await store.prisma.file.findFirst({
          where: {
            file_id: file.file_id,
            user_id: user.id,
            drive_id: drive.id,
          },
        });
        if (!existing) {
          await store.prisma.file.create({
            data: {
              id: file_id,
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
            },
          });
          return;
        }
        const diff = get_diff_of_file(file, existing);
        if (diff === null) {
          return;
        }
        await store.prisma.file.update({
          where: {
            id: existing.id,
          },
          data: diff,
        });
      })();
      await (async () => {
        const existing = await store.prisma.tmp_file.findFirst({
          where: {
            file_id: file.file_id,
            user_id: user.id,
            drive_id: drive.id,
          },
        });
        if (existing) {
          await store.prisma.tmp_file.delete({
            where: {
              id: existing.id,
            },
          });
        }
      })();
    };
    walker.on_episode = async (parsed) => {
      const { tv, episode } = parsed;
      const processor = new EpisodeFileProcessor({
        unique_id,
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
        unique_id,
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
      this.parsed_media_sources.push(r.data);
      this.emit(Events.AddMovie, r.data);
      return;
    };
    walker.on_profile = async (profile) => {
      // console.log(JSON.stringify(profile, null, 2));
      const processor = new MediaProfileProcessor({
        token: tmdb_token,
        assets,
        store,
        user,
        drive,
        searcher,
      });
      this.emit(Events.Print, Article.build_line(["解析出详情", profile.name || profile.original_name || ""]));
      this.emit(Events.Print, Article.build_line(["on_profile before processor.run(profile)"]));
      // console.log('media_profile before processor.run');
      const r = await processor.run(profile);
      // console.log('media_profile after processor.run');
      if (r.error) {
        this.emit(Events.Print, Article.build_line(["创建详情失败，因为", r.error.message]));
        return;
      }
      this.emit(Events.Print, Article.build_line(["on_profile after processor.run(profile)"]));
      return;
    };
    searcher.on_percent((percent) => {
      // console.log("[DOMAIN]analysis/index - searcher.on_percent", `${(percent * 100).toFixed(2)}%`);
      this.emit(Events.Percent, Number((0.5 + percent / 2).toFixed(2)));
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
  /**
   * 全量索引云盘
   */
  async run(options: Partial<{ force: boolean; before_search?: () => Promise<boolean> }> = {}) {
    const { drive } = this;
    const { before_search } = options;
    const { client } = drive;
    if (!drive.has_root_folder()) {
      const tip = "未设置索引目录，请先设置索引目录";
      this.emit(Events.Print, Article.build_line([tip]));
      this.emit(Events.Error, new Error(tip));
      return Result.Err(tip);
    }
    const walker = this.walker;
    const ignore_files = this.user.get_ignore_files().map((f) => [this.drive.profile.root_folder_name, f].join("/"));
    walker.filter = async (cur_file) => {
      if (ignore_files.includes([cur_file.parent_paths, cur_file.name].join("/"))) {
        return true;
      }
      return false;
    };

    let episode_count = 0;
    let movie_count = 0;
    this.on(Events.AddEpisode, (data) => {
      episode_count += 1;
      return;
    });
    this.on(Events.AddMovie, (data) => {
      movie_count += 1;
      return;
    });
    const folder = new Folder(drive.profile.root_folder_id!, {
      client,
    });
    const r = await folder.profile();
    if (r.error) {
      this.emit(Events.Error, new Error("获取索引根目录失败"));
      return Result.Err(r.error);
    }
    // @todo 如果 run 由于内部调用 folder.next() 报错，这里没有处理会导致一直 pending
    await walker.run(folder, []);
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
    if (before_search) {
      const need_search = await before_search();
      if (!need_search) {
        this.emit(Events.Finished);
        return Result.Ok(null);
      }
    }
    // console.log("[DOMAIN]analysis/index - before searcher.run", files_prepare_search);
    await this.searcher.run();
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
    const { force = false, before_search } = options;
    const { client } = this.drive;
    if (!this.drive.has_root_folder()) {
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
        // @todo 如果文件不存在，直接死循环了
        // console.log('before client.fetch_parent_paths', client.root_folder, file.file_id);
        const parent_paths_r = await client.fetch_parent_paths(file.file_id, file.type);
        if (parent_paths_r.error) {
          // console.log("fetch_parent_paths failed,", parent_paths_r.error.message);
          this.emit(
            Events.Print,
            Article.build_line(["client.fetch_parent_paths failed, because ", parent_paths_r.error.message])
          );
          return;
        }
        const paths = parent_paths_r.data;
        const parents_and_cur = paths.map((folder) => {
          return {
            id: folder.file_id,
            file_id: folder.file_id,
            file_name: folder.name,
            parent_file_id: folder.parent_file_id,
            name: "",
            original_name: "",
            season: "",
            year: "",
          };
        });
        const cur = parents_and_cur[parents_and_cur.length - 1];
        const parents = parents_and_cur.slice(0, -1);
        if (file.type === FileType.File) {
          const file = new File(cur.file_id, {
            name: cur.name,
            parents,
            parent: null,
            client,
          });
          await file.set_profile({
            // id: file.id,
            // parent_file_id: cur.parent_file_id,
            name: cur.file_name,
            size: file.size,
            content_hash: null,
            mime_type: null,
          });
          this.emit(Events.Print, Article.build_line(["before await walker.run(file)"]));
          await walker.run(file, parents);
          if (before_search) {
            const need_search = await before_search();
            if (!need_search) {
              this.emit(Events.Finished);
              return Result.Ok(null);
            }
          }
          await this.searcher.run2([file.id], { force });
          return;
        }
        if (file.type === FileType.Folder) {
          const folder = new Folder(cur.file_id, {
            client,
            name: cur.name,
          });
          await folder.profile();
          this.emit(Events.Print, Article.build_line(["before await walker.run(folder)"]));
          const r = await walker.run(folder, parents);
          if (r.error) {
            this.emit(Events.Print, Article.build_line(["walker.run(folder) failed, because", r.error.message]));
          }
          this.emit(
            Events.Print,
            Article.build_line([
              `[${this.drive.name}]`,
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
          if (this.parsed_media_sources.length === 0) {
            return;
          }
          if (before_search) {
            const need_search = await before_search();
            if (!need_search) {
              this.emit(Events.Finished);
              return Result.Ok(null);
            }
          }
          const file_ids = this.parsed_media_sources.map((source) => source.file_id);
          this.parsed_media_sources = [];
          // console.log("before this.searcher.run2");
          await this.searcher.run2(file_ids, { force });
          return;
        }
        this.emit(Events.Print, Article.build_line([`[${this.drive.name}]`, `未知的文件类型 '${file.type}'`]));
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
