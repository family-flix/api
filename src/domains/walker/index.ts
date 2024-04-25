/**
 * @file 文件夹遍历解析器
 */
import { Handler, BaseDomain } from "@/domains/base";
import { File, Folder } from "@/domains/folder/index";
import { ArticleLineNode, ArticleSectionNode, ArticleTextNode } from "@/domains/article/index";
import { MediaProfileTypesFromNFOFile, NfoFileProcessor } from "@/domains/file_processor/nfo";
import {
  format_episode_number,
  format_season_number,
  parse_filename_for_video,
} from "@/utils/parse_filename_for_video";
import { is_img_file, is_nfo_file, is_subtitle_file, is_video_file, noop, promise_noop, sleep } from "@/utils/index";
import { MutableRecordV2, Result } from "@/types/index";
import { MediaTypes } from "@/constants";

export type SearchedEpisode = {
  tv: {
    /** tv 名称 */
    name: string;
    original_name: string;
    /** 文件夹/文件 id，如果该 tv name 来自 episode，该字段就会为空 */
    file_id?: string;
    /** 文件夹/文件名，如果该 tv name 来自 episode，该字段就会为空 */
    file_name?: string;
  };
  season: {
    /** 第几季 */
    season_text: string | null;
    /** 文件夹/文件 id，如果该 season 来自 episode，该字段就会为空 */
    file_id?: string;
    /** 文件夹/文件名，如果该 season 来自 episode，该字段就会为空 */
    file_name?: string;
  };
  episode: {
    /** 文件夹/文件名 */
    file_id: string;
    /** 文件夹/文件名 */
    file_name: string;
    /** 父文件夹路径 */
    parent_paths: string;
    /** 父文件夹 id，和 parent_paths 是一一对应关系 */
    parent_ids: string;
    /** 父文件夹id */
    parent_file_id: string;
    /** 第几季 */
    season_text: string | null;
    /** 第几集 */
    episode_text: string;
    year: string | null;
    /** 大小（单位字节）*/
    size: number;
    md5: string | null;
  };
  /** 代码中走了哪个分支，方便定位问题 */
  _position?: string;
};
export type SearchedMovie = {
  file_id: string;
  file_name: string;
  name: string;
  original_name: string;
  year: string | null;
  parent_paths: string;
  parent_file_id: string;
  size: number;
  md5: string | null;
  _position: string;
};
export type SearchedSubtitle = {};
export type ParentFolder = Pick<
  ReturnType<typeof parse_filename_for_video>,
  "name" | "original_name" | "season" | "year"
> & {
  /** 文件夹或文件 id */
  file_id: string;
  /** 原始文件名称 */
  file_name: string;
};
type ArchivedEpisode = {
  file_id: string;
  file_name: string;
  file_path: string;
  name: string;
  original_name: string;
  season?: string;
  episode?: string;
};
type PendingFile = {
  file_id: string;
  name: string;
  parent_paths: string;
  type: "subtitle" | "img" | "nfo";
};
type EpisodeProfileInDrive = {
  /** 其实用不上 */
  id: string;
  name: string;
  overview: string | null;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  runtime: number | null;
  still_path: {
    file_id: string;
    name: string;
  } | null;
  subtitle_files: {
    file_id: string;
    name: string;
  }[];
  /** 根据该视频文件找到的相关联剧集详情 */
  relative_source_id: string;
};
type SeasonProfileInDrive = {
  id: string;
  name: string;
  overview: string | null;
  season_number: number;
  air_date: string | null;
  poster_path: {
    file_id: string;
  } | null;
  backdrop_path: {
    file_id: string;
  } | null;
  vote_average: number | null;
  episode_count: number;
  episodes: EpisodeProfileInDrive[];
};
export type MediaProfileInDrive = MutableRecordV2<{
  [MediaTypes.Season]: {
    id: string;
    name: string;
    original_name: string | null;
    overview: string | null;
    poster_path: {
      file_id: string;
    } | null;
    backdrop_path: {
      file_id: string;
    } | null;
    first_air_date: string | null;
    number_of_seasons: number;
    seasons: SeasonProfileInDrive[];
    origin_country: string[];
    next_episode_to_air: string | null;
    in_production: boolean;
    genres: string[];
    tmdb_id: string | null;
    tvdb_id: string | null;
    imdb_id: string | null;
  };
  [MediaTypes.Movie]: {
    id: string;
    name: string;
    original_name: string | null;
    overview: string | null;
    poster_path: {
      file_id: string;
    } | null;
    backdrop_path: {
      file_id: string;
    } | null;
    runtime: number | null;
    air_date: string | null;
    origin_country: string[];
    tmdb_id: string | null;
    tvdb_id: string | null;
    imdb_id: string | null;
  };
}>;
const DEFAULT_SEASON_NUMBER = "S01";

enum Events {
  /** 找到一个文件 */
  File,
  /** 找到一个剧集 */
  Episode,
  /** 找到一个电影 */
  Movie,
  /** 找到一个字幕 */
  Subtitle,
  /** 找到一个图片 */
  Img,
  /** 找到一个 nfo */
  NFO,
  /** 遍历发生错误 */
  Error,
  /** 遍历发生警告 */
  Warning,
  /** 遍历被主动终止 */
  Stop,
  Print,
}
type TheTypesOfEvents = {
  /** 遍历到一个文件 */
  [Events.File]: {
    file_id: string;
    name: string;
    type: "file" | "folder";
    size?: number;
    parent_file_id: string;
    parent_paths: string;
  };
  [Events.Episode]: SearchedEpisode;
  [Events.Movie]: SearchedMovie;
  /** 遍历到一个字幕文件 */
  [Events.Subtitle]: {
    file_id: string;
    name: string;
  };
  /** 遍历到一个图片文件 */
  [Events.Img]: {
    name: string;
    file_id: string;
  };
  /** 遍历到一个 NFO 文件 */
  [Events.NFO]: {
    name: string;
    file_id: string;
  };
  [Events.Error]: { file_id: string; name: string; parent_paths: string; _position: string };
  [Events.Warning]: { file_id: string; name: string; parent_paths: string; _position: string };
  [Events.Stop]: void;
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
};
type FolderWalkerProps = {
  /**
   * 用户自定义文件名解析规则
   */
  filename_rules?: {
    replace: [string, string];
  }[];
  filter?: (options: {
    file_id: string;
    name: string;
    type: string;
    parent_file_id: string;
    parent_paths: string;
  }) => Promise<boolean>;
  on_print?: (v: ArticleLineNode | ArticleSectionNode) => void;
};

/**
 * 遍历指定文件夹、子孙文件夹，并解析遍历到的文件夹、文件名称是否是影视剧
 */
export class FolderWalker extends BaseDomain<TheTypesOfEvents> {
  /** 从哪个文件夹开始遍历的 */
  start_folder_id?: string;
  /** 是否需要终止 */
  need_stop = false;
  /** 每次调用列表接口后，是否需要延迟一会 */
  delay?: number;
  /**
   * 在访问到文件夹/文件时，判断是否要处理（解析或读取子文件夹）
   * 返回 true 表示「不处理」！
   */
  filter?: FolderWalkerProps["filter"];
  filename_rules: {
    replace: [string, string];
  }[] = [];

  /**
   * 索引到所有影片
   * @deprecated
   */
  episodes: ArchivedEpisode[] = [];
  /** 未处理的文件（字幕、图片、刮削数据等） */
  // pending_files: PendingFile[] = [];
  /** 用于处理 pending__files 的剧集 */
  // relative_episodes: ArchivedEpisode[] = [];

  /** 读取到一个文件夹/文件时的回调 */
  on_file: (folder: {
    file_id: string;
    name: string;
    type: "file" | "folder";
    size: number;
    md5: string | null;
    parent_file_id: string;
    parent_paths: string;
  }) => Promise<void> = promise_noop;
  /** 找到一个剧集时的回调 */
  on_episode: (tasks: SearchedEpisode) => Promise<void> = promise_noop;
  /** 找到一个电影时的回调 */
  on_movie: (movie: SearchedMovie) => Promise<void> = promise_noop;
  on_subtitle: (subtitle: {
    file_id: string;
    name: string;
    episode: { file_id: string; name: string };
  }) => Promise<void> = promise_noop;
  on_img: (img: { file_id: string; name: string; episode: { file_id: string; name: string } }) => Promise<void> =
    promise_noop;
  /** 解析出一个电影/电视剧详情信息 */
  on_profile: (data: MediaProfileInDrive) => Promise<void> = promise_noop;
  /** 解析到影片文件但解析失败时的回调 */
  on_error: (file: { file_id: string; name: string; parent_paths: string; _position: string }) => void = noop;
  on_warning: (file: { file_id: string; name: string; parent_paths: string; _position: string }) => void = noop;

  constructor(options: FolderWalkerProps) {
    super();

    const { filename_rules = [], filter, on_print } = options;
    this.filename_rules = filename_rules;
    if (filter) {
      this.filter = filter;
    }
    if (on_print) {
      this.on_print(on_print);
    }
  }

  /**
   * 开始遍历云盘
   */
  async run(
    data: Folder | File,
    parents: {
      file_id: string;
      file_name: string;
      name: string;
      original_name: string;
      season: string;
      year: string;
    }[] = []
  ) {
    this.start_folder_id = data.id;
    await this.walk(data, parents);
    // console.log("[DOMAIN]walker - before handle_folder_after_walk");
    await this.handle_folder_after_walk(data);
    return Result.Ok(this.episodes);
  }
  /**
   * 递归遍历给定的文件夹
   */
  async walk(
    data: Folder | File,
    parents: {
      file_id: string;
      file_name: string;
      name: string;
      original_name: string;
      season: string;
      year: string;
    }[] = []
  ) {
    const { id: file_id, type, name, size, parent_file_id, md5 } = data;
    // console.log("[DOMAIN]walker - walk", file_id, name, parents);
    const parent_paths = parents.map((p) => p.file_name).join("/");
    const parent_ids = parents.map((p) => p.file_id).join("/");
    const filepath = (() => {
      if (!parent_paths) {
        return name;
      }
      return parent_paths + "/" + name;
    })();
    // this.log(
    //   "[](walk)" + chalk.yellowBright("begin"),
    //   chalk.gray(parent_paths) + chalk.magenta("/") + chalk.magenta(name),
    //   file_id
    // );
    if (this.need_stop) {
      this.emit(Events.Stop);
      return;
    }
    if (this.filter && file_id !== this.start_folder_id) {
      const need_skip = await this.filter({
        file_id,
        name,
        type,
        parent_file_id,
        parent_paths,
      });
      if (need_skip) {
        return;
      }
    }
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: [
          new ArticleTextNode({
            color: "gray",
            text: parent_paths,
          }),
          new ArticleTextNode({
            color: "magenta",
            text: "/",
          }),
          new ArticleTextNode({
            color: "magenta",
            text: name,
          }),
        ],
      })
    );
    await this.on_file({
      file_id,
      name,
      parent_file_id,
      parent_paths,
      type,
      size,
      md5: data.md5,
    });
    if (type === "folder") {
      const parsed_info = parse_filename_for_video(
        name,
        ["name", "original_name", "season", "episode", "year"],
        this.filename_rules
      );
      const folder = data as Folder;
      await (async () => {
        do {
          if (this.delay) {
            await sleep(this.delay);
          }
          const r = await folder.next();
          // console.log("after folder.next()", name, this.need_stop);
          if (this.need_stop) {
            this.emit(Events.Stop);
            return;
          }
          if (r.error) {
            // @todo listen error and notice
            continue;
          }
          for (let i = 0; i < r.data.length; i += 1) {
            const file = r.data[i];
            const { name: parsed_name, original_name, season, year } = parsed_info;
            const parent_folders = parents
              .map((p) => {
                return { ...p };
              })
              .concat({
                file_id,
                file_name: name,
                name: parsed_name,
                original_name,
                season,
                year,
              });
            await this.walk(file, parent_folders);
            await (async () => {
              if (file instanceof Folder) {
                if (file.can_save_episode) {
                  await this.handle_folder_after_walk(file);
                  return;
                }
                file.up_episodes();
                file.up_relative_files();
              }
            })();
          }
        } while (folder.next_marker);
      })();
      return;
    }
    if (is_video_file(name)) {
      const parsed_info = parse_filename_for_video(
        name,
        ["name", "original_name", "season", "episode", "year"],
        this.filename_rules
      );
      function generate_episode(profile: { name: string; original_name: string; season?: string; episode?: string }) {
        const { name: n, original_name, season, episode } = profile;
        if (episode) {
          return {
            file_id,
            file_name: name,
            file_path: filepath,
            parent_paths: parent_paths,
            name: n,
            original_name: original_name,
            season,
            episode,
          };
        }
        return {
          file_id,
          file_name: name,
          file_path: filepath,
          name: n,
          original_name,
        };
      }
      function create_tasks(d: {
        tv: {
          file_id?: string;
          file_name?: string;
          name: string;
          original_name: string;
        };
        season: {
          file_id?: string;
          file_name?: string;
          season: string | null;
        };
        episode: {
          episode: string;
          year: string | null;
        };
        _position?: string;
      }): SearchedEpisode {
        const { tv, season, episode, _position } = d;
        return {
          tv: {
            file_id: tv.file_id,
            file_name: tv.file_name,
            name: tv.name,
            original_name: tv.original_name,
          },
          season: {
            file_id: season.file_id,
            file_name: season.file_name,
            season_text: season.season,
          },
          episode: {
            file_id,
            parent_file_id,
            parent_paths,
            parent_ids,
            file_name: name,
            season_text: season.season,
            episode_text: episode.episode,
            year: episode.year,
            size,
            md5,
          },
          _position,
          // _start_folder_id: start_folder_id,
        };
      }
      if (!parsed_info.episode) {
        const last_parent = parents.slice(-1)[0];
        if (!parsed_info.name && !parsed_info.original_name) {
          const reason = "影片文件未包含集数信息";
          if (!last_parent?.name) {
            await this.on_error({
              file_id,
              name,
              parent_paths,
              _position: "error1",
            });
            /**
             * 如果一个文件既没有集数，也没有名字，视为无效文件
             * __root/name1/s01/empty.mp4@@错误影片1
             */
            // this.log(chalk.redBright("[ERROR]"), "error1", name, reason);
            return;
          }
          await this.on_movie({
            file_id,
            file_name: name,
            name: last_parent?.name,
            original_name: last_parent?.original_name,
            year: parsed_info.year || last_parent?.year,
            parent_paths,
            parent_file_id,
            size,
            md5,
            _position: "movie1",
          });
          return;
        }
        await this.on_movie({
          file_id,
          file_name: name,
          name: parsed_info.name,
          original_name: parsed_info.original_name,
          year: parsed_info.year || last_parent?.year,
          parent_paths,
          parent_file_id,
          size,
          md5,
          _position: "movie1",
        });
        // const reason = "可能是电影";
        // await this.on_error({
        //   file_id,
        //   name,
        //   parent_paths,
        //   _position: "error2",
        // });
        /**
         * 没有 episode_number 但是有名字
         * 比如现在有 tv 文件夹里面可能包含一些 MV，这些 MV 是视频，但不是剧集。应该认为是「电影」，后面当做电影去查询，查询不到再认为属于异常数据好了
         * __root/name1/s01/name2.mp4@@错误影片2（可能是电影）
         */
        // this.log(chalk.redBright("[ERROR]"), "error2", name, reason);
        return;
      }
      if (!parsed_info.season) {
        if (!parsed_info.name && !parsed_info.original_name) {
          const tv_and_season_folder = this.find_season_and_tv_folder(parents);
          // log('[]', parent, tv_and_season_folder);
          if (tv_and_season_folder) {
            if (tv_and_season_folder.season) {
              const tasks = create_tasks({
                tv: tv_and_season_folder.tv,
                season: tv_and_season_folder.season,
                episode: { ...parsed_info, year: parsed_info.year || tv_and_season_folder.year },
                _position: "normal1",
              });
              await this.on_episode(tasks);
              await this.handle_episode(
                generate_episode({
                  name: tv_and_season_folder.tv.name,
                  original_name: tv_and_season_folder.tv.original_name,
                  season: tv_and_season_folder.season.season,
                  episode: parsed_info.episode,
                }),
                data
              );
              /**
               * @example
               * __root/name1/s01/e01.mp4__@@正常1
               */
              // this.emit(
              //   Events.Print,
              //   new ArticleLineNode({
              //     children: [
              //       new ArticleTextNode({
              //         text: "[](walk)[normal1]",
              //       }),
              //       new ArticleTextNode({
              //         color: "greenBright",
              //         text: tv_and_season_folder.season.season,
              //       }),
              //       new ArticleTextNode({
              //         color: "blueBright",
              //         text: tv_and_season_folder.tv.name,
              //       }),
              //     ],
              //   })
              // );
              // this.log(
              //   "[](walk)[normal1]",
              //   chalk.greenBright(tv_and_season_folder.season.season),
              //   chalk.blueBright(tv_and_season_folder.tv.name)
              // );
              return;
            }
            const tasks = create_tasks({
              tv: tv_and_season_folder.tv,
              season: {
                // season: DEFAULT_SEASON_NUMBER,
                season: null,
              },
              episode: { ...parsed_info, year: parsed_info.year || tv_and_season_folder.year },
              _position: "normal2",
            });
            await this.on_episode(tasks);
            await this.handle_episode(
              generate_episode({
                name: tv_and_season_folder.tv.name,
                original_name: tv_and_season_folder.tv.original_name,
                season: DEFAULT_SEASON_NUMBER,
                episode: parsed_info.episode,
              }),
              data
            );
            /**
             * @example
             * __root/name1/e01.mp4__@@正常2
             */
            // this.emit(
            //   Events.Print,
            //   new ArticleLineNode({
            //     children: [
            //       new ArticleTextNode({
            //         text: "[](walk)[normal2]",
            //       }),
            //       new ArticleTextNode({
            //         color: "blueBright",
            //         text: tv_and_season_folder.tv.name,
            //       }),
            //       new ArticleTextNode({
            //         color: "greenBright",
            //         text: DEFAULT_SEASON_NUMBER,
            //       }),
            //     ],
            //   })
            // );
            // this.log(
            //   "[](walk)[normal2]",
            //   chalk.greenBright(DEFAULT_SEASON_NUMBER),
            //   chalk.blueBright(tv_and_season_folder.tv.name)
            // );
            return;
          }
          const reason = "影片文件及父文件夹未找到合法名称";
          await this.on_error({
            file_id,
            name,
            parent_paths,
            _position: "error3",
          });
          /**
           * @example
           * __root/empty/e01.mp4__ or __root/empty/s01/e01.mp4__@@异常3
           */
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  color: "redBright",
                  text: "[ERROR]",
                }),
                new ArticleTextNode({
                  text: "error3",
                }),
                new ArticleTextNode({
                  text: name,
                }),
                new ArticleTextNode({
                  text: reason,
                }),
              ],
            })
          );
          // this.log(chalk.redBright("[ERROR]"), "error3", name, reason);
          return;
        }
        // episode 有名字
        const tv_and_season_folder = this.find_season_and_tv_folder(parents);
        if (tv_and_season_folder) {
          if (this.has_same_name(tv_and_season_folder.tv, parsed_info)) {
            if (tv_and_season_folder.season) {
              const tasks = create_tasks({
                tv: tv_and_season_folder.tv,
                season: tv_and_season_folder.season,
                episode: { ...parsed_info, year: parsed_info.year || tv_and_season_folder.year },
                _position: "normal3",
              });
              await this.on_episode(tasks);
              await this.handle_episode(
                generate_episode({
                  name: tv_and_season_folder.tv.name,
                  original_name: tv_and_season_folder.tv.original_name,
                  season: tv_and_season_folder.season.season,
                  episode: parsed_info.episode,
                }),
                data
              );
              /**
               * @example
               * return __root/name1/s01/name1.e01.mp4@@正常3
               */
              // this.emit(
              //   Events.Print,
              //   new ArticleLineNode({
              //     children: [
              //       new ArticleTextNode({
              //         text: "[](walk)[normal3]",
              //       }),
              //       new ArticleTextNode({
              //         color: "greenBright",
              //         text: tv_and_season_folder.season.season,
              //       }),
              //       new ArticleTextNode({
              //         color: "blueBright",
              //         text: tv_and_season_folder.tv.name,
              //       }),
              //     ],
              //   })
              // );
              // this.log(
              //   "[](walk)[normal3]",
              //   chalk.greenBright(tv_and_season_folder.season.season),
              //   chalk.blueBright(tv_and_season_folder.tv.name)
              // );
              return;
            }
            const tasks = create_tasks({
              tv: tv_and_season_folder.tv,
              season: {
                // season: DEFAULT_SEASON_NUMBER,
                season: null,
              },
              episode: { ...parsed_info, year: parsed_info.year || tv_and_season_folder.year },
              _position: "normal4",
            });
            await this.on_episode(tasks);
            await this.handle_episode(
              generate_episode({
                name: tv_and_season_folder.tv.name,
                original_name: tv_and_season_folder.tv.original_name,
                season: DEFAULT_SEASON_NUMBER,
                episode: parsed_info.episode,
              }),
              data
            );
            /**
             * @example
             * __root/name1/name1.e01.mp4@@正常4
             */
            // this.emit(
            //   Events.Print,
            //   new ArticleLineNode({
            //     children: [
            //       new ArticleTextNode({
            //         text: "[](walk)[normal4]",
            //       }),
            //       new ArticleTextNode({
            //         color: "greenBright",
            //         text: DEFAULT_SEASON_NUMBER,
            //       }),
            //       new ArticleTextNode({
            //         color: "blueBright",
            //         text: tv_and_season_folder.tv.name,
            //       }),
            //     ],
            //   })
            // );
            // this.log(
            //   "[](walk)[normal4]",
            //   chalk.greenBright(DEFAULT_SEASON_NUMBER),
            //   chalk.blueBright(tv_and_season_folder.tv.name)
            // );
            return;
          }
          const tasks = create_tasks({
            tv: parsed_info,
            season: {
              season: "S01",
            },
            episode: parsed_info,
            _position: "tip1",
          });
          await this.on_episode(tasks);
          await this.handle_episode(
            generate_episode({
              name: parsed_info.name,
              original_name: parsed_info.original_name,
              season: "S01",
              episode: parsed_info.episode,
            }),
            data
          );
          /**
           * @example
           * __root/name1/name2.e01.mp4@@需要提示1
           */
          const reason = `影片解析出的名字 '${parsed_info.name || parsed_info.original_name}' 和所在文件夹的名字 '${
            tv_and_season_folder.tv.name || tv_and_season_folder.tv.original_name
          }' 不一致`;
          await this.on_warning({
            file_id,
            name,
            parent_paths,
            _position: "tip1",
          });
          // this.emit(
          //   Events.Print,
          //   new ArticleLineNode({
          //     children: [
          //       new ArticleTextNode({
          //         text: "[](walk)[tip1]",
          //       }),
          //       new ArticleTextNode({
          //         text: reason,
          //       }),
          //     ],
          //   })
          // );
          // this.log("[](walk)[tip1]", reason);
          return;
        }
        const tasks = create_tasks({
          tv: parsed_info,
          season: {
            // season: DEFAULT_SEASON_NUMBER
            season: null,
          },
          episode: parsed_info,
          _position: "normal5",
        });
        await this.on_episode(tasks);
        await this.handle_episode(
          generate_episode({
            name: parsed_info.name,
            original_name: parsed_info.original_name,
            // season: DEFAULT_SEASON_NUMBER,
            episode: parsed_info.episode,
          }),
          data
        );
        /**
         * @example
         * __root/empty/name1.e01.mp4 or __root/empty/s01/name.e01.mp4@@正常5
         */
        // this.emit(
        //   Events.Print,
        //   new ArticleLineNode({
        //     children: [
        //       new ArticleTextNode({
        //         text: "[](walk)[normal5]",
        //       }),
        //       new ArticleTextNode({
        //         color: "greenBright",
        //         text: DEFAULT_SEASON_NUMBER,
        //       }),
        //       new ArticleTextNode({
        //         color: "blueBright",
        //         text: parsed_info.name,
        //       }),
        //     ],
        //   })
        // );
        // this.log("[](walk)[normal5]", chalk.greenBright(DEFAULT_SEASON_NUMBER), chalk.blueBright(parsed_info.name));
        return;
      }
      // 如果没有 self.name
      if (!parsed_info.name && !parsed_info.original_name) {
        const tv_and_season_folder = this.find_season_and_tv_folder(parents);
        // 如果没有 tv_and_season
        if (!tv_and_season_folder) {
          const reason = "影片及父文件夹均未找到合法名称";
          await this.on_error({
            file_id,
            name,
            parent_paths,
            _position: "error5",
          });
          /**
           * @example
           * __root/empty/s01.e01.mp4 or __root/empty/s01/s01.e01.mp4@@异常5
           */
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  color: "redBright",
                  text: "[ERROR]",
                }),
                new ArticleTextNode({
                  text: "error5",
                }),
                new ArticleTextNode({
                  text: name,
                }),
                new ArticleTextNode({
                  text: reason,
                }),
              ],
            })
          );
          // this.log(chalk.redBright("[ERROR]"), "error5", name, reason);
          return;
        }
        // 如果有 tv_and_season.season
        if (tv_and_season_folder.season) {
          // 如果 tv_and_season.season 和 self.season 一样
          if (tv_and_season_folder.season.season === parsed_info.season) {
            const tasks = create_tasks({
              tv: tv_and_season_folder.tv,
              season: tv_and_season_folder.season,
              episode: { ...parsed_info, year: parsed_info.year || tv_and_season_folder.year },
              _position: "normal6",
            });
            await this.on_episode(tasks);
            await this.handle_episode(
              generate_episode({
                name: tv_and_season_folder.tv.name,
                original_name: tv_and_season_folder.tv.original_name,
                season: tv_and_season_folder.season.season,
                episode: parsed_info.episode,
              }),
              data
            );
            /**
             * @example
             * __root/name1/s01/s01.e01.mp4@@正常6
             */
            // this.emit(
            //   Events.Print,
            //   new ArticleLineNode({
            //     children: [
            //       new ArticleTextNode({
            //         text: "[](walk)[normal6]",
            //       }),
            //       new ArticleTextNode({
            //         color: "greenBright",
            //         text: tv_and_season_folder.season.season,
            //       }),
            //       new ArticleTextNode({
            //         color: "blueBright",
            //         text: tv_and_season_folder.tv.name,
            //       }),
            //     ],
            //   })
            // );
            // this.log(
            //   "[](walk)[normal6]",
            //   chalk.greenBright(tv_and_season_folder.season.season),
            //   chalk.blueBright(tv_and_season_folder.tv.name)
            // );
            return;
          }
          const tasks = create_tasks({
            tv: tv_and_season_folder.tv,
            season: { season: parsed_info.season },
            episode: { ...parsed_info, year: parsed_info.year || tv_and_season_folder.year },
            _position: "tip2",
          });
          await this.on_episode(tasks);
          await this.handle_episode(
            generate_episode({
              name: tv_and_season_folder.tv.name,
              original_name: tv_and_season_folder.tv.original_name,
              season: parsed_info.season,
              episode: parsed_info.episode,
            }),
            data
          );
          /**
           * @example
           * __root/name1/s02/s01.e01.mp4@@需要提示2
           */
          const reason = `影片解析出季数为 '${parsed_info.season}' 和所在文件夹的季数 '${tv_and_season_folder.season.season}' 不一致`;
          await this.on_warning({
            file_id,
            name,
            parent_paths,
            _position: "tip2",
          });
          // this.emit(
          //   Events.Print,
          //   new ArticleLineNode({
          //     children: [
          //       new ArticleTextNode({
          //         text: "[](walk)[tip2]",
          //       }),
          //       new ArticleTextNode({
          //         text: reason,
          //       }),
          //     ],
          //   })
          // );
          // this.log("[](walk)[tip2]", reason);
          return;
        }
        const tasks = create_tasks({
          tv: tv_and_season_folder.tv,
          season: parsed_info,
          episode: { ...parsed_info, year: parsed_info.year || tv_and_season_folder.year },
          _position: "normal7",
        });
        await this.on_episode(tasks);
        await this.handle_episode(
          generate_episode({
            name: tv_and_season_folder.tv.name,
            original_name: tv_and_season_folder.tv.original_name,
            season: parsed_info.season,
            episode: parsed_info.episode,
          }),
          data
        );
        /**
         * @example
         * __root/name1/s01.e01.mp4@@正常7
         */
        // this.emit(
        //   Events.Print,
        //   new ArticleLineNode({
        //     children: [
        //       new ArticleTextNode({
        //         text: "[](walk)[normal7]",
        //       }),
        //       new ArticleTextNode({
        //         color: "greenBright",
        //         text: parsed_info.season,
        //       }),
        //       new ArticleTextNode({
        //         color: "blueBright",
        //         text: tv_and_season_folder.tv.name,
        //       }),
        //     ],
        //   })
        // );
        // this.log(
        //   "[](walk)[normal7]",
        //   chalk.greenBright(parsed_info.season),
        //   chalk.blueBright(tv_and_season_folder.tv.name)
        // );
        return;
      }
      const tv_and_season_folder = this.find_season_and_tv_folder(parents);
      // 如果没有 tv_and_season
      if (!tv_and_season_folder) {
        const tasks = create_tasks({
          tv: parsed_info,
          season: parsed_info,
          episode: parsed_info,
          _position: "normal8",
        });
        await this.on_episode(tasks);
        await this.handle_episode(
          generate_episode({
            name: parsed_info.name,
            original_name: parsed_info.original_name,
            season: parsed_info.season,
            episode: parsed_info.episode,
          }),
          data
        );
        /**
         * @example
         * __root/empty/name1.s01.e01.mp4 or __root/empty/s02/name1.s01.e01.mp4@@正常8
         */
        // this.emit(
        //   Events.Print,
        //   new ArticleLineNode({
        //     children: [
        //       new ArticleTextNode({
        //         text: "[](walk)[normal8]",
        //       }),
        //       new ArticleTextNode({
        //         color: "greenBright",
        //         text: parsed_info.season,
        //       }),
        //       new ArticleTextNode({
        //         color: "blueBright",
        //         text: parsed_info.name,
        //       }),
        //     ],
        //   })
        // );
        // this.log("[](walk)[normal8]", chalk.greenBright(parsed_info.season), chalk.blueBright(parsed_info.name));
        return;
      }
      // 如果 tv_and_season.name 和 self.name 一样
      if (this.has_same_name(tv_and_season_folder.tv, parsed_info)) {
        // 如果有 tv_and_season.season
        if (tv_and_season_folder.season) {
          // 如果 tv_and_season.season 和 self.season 一样
          if (tv_and_season_folder.season.season === parsed_info.season) {
            const tasks = create_tasks({
              tv: tv_and_season_folder.tv,
              season: tv_and_season_folder.season,
              episode: { ...parsed_info, year: parsed_info.year || tv_and_season_folder.year },
              _position: "normal9",
            });
            await this.on_episode(tasks);
            await this.handle_episode(
              generate_episode({
                name: tv_and_season_folder.tv.name,
                original_name: tv_and_season_folder.tv.original_name,
                season: tv_and_season_folder.season.season,
                episode: parsed_info.episode,
              }),
              data
            );
            /**
             * @example
             * __root/name1/s01/name1.s01.e01.mp4@@正常9
             */
            // this.emit(
            //   Events.Print,
            //   new ArticleLineNode({
            //     children: [
            //       new ArticleTextNode({
            //         text: "[](walk)[normal9]",
            //       }),
            //       new ArticleTextNode({
            //         color: "greenBright",
            //         text: tv_and_season_folder.season.season,
            //       }),
            //       new ArticleTextNode({
            //         color: "blueBright",
            //         text: tv_and_season_folder.tv.name,
            //       }),
            //     ],
            //   })
            // );
            // this.log(
            //   "[](walk)[normal9]",
            //   chalk.greenBright(tv_and_season_folder.season.season),
            //   chalk.blueBright(tv_and_season_folder.tv.name)
            // );
            return;
          }
          const tasks = create_tasks({
            tv: tv_and_season_folder.tv,
            season: parsed_info,
            episode: { ...parsed_info, year: parsed_info.year || tv_and_season_folder.year },
            _position: "tip3",
          });
          await this.on_episode(tasks);
          await this.handle_episode(
            generate_episode({
              name: tv_and_season_folder.tv.name,
              original_name: tv_and_season_folder.tv.original_name,
              season: parsed_info.season,
              episode: parsed_info.episode,
            }),
            data
          );
          /**
           * @example
           * __root/name1/s02/name1.s01.e01.mp4@@需要提示3
           */
          const reason = `影片解析出季数为 '${parsed_info.season}' 和所在文件夹的季数 '${tv_and_season_folder.season.season}' 不一致`;
          await this.on_warning({
            file_id,
            name,
            parent_paths,
            _position: "tip3",
          });
          // this.emit(
          //   Events.Print,
          //   new ArticleLineNode({
          //     children: [
          //       new ArticleTextNode({
          //         text: "[](walk)[tip3]",
          //       }),
          //       new ArticleTextNode({
          //         text: reason,
          //       }),
          //     ],
          //   })
          // );
          // this.log("[](walk)[tip3]", reason);
          return;
        }
        const tasks = create_tasks({
          tv: tv_and_season_folder.tv,
          season: parsed_info,
          episode: { ...parsed_info, year: parsed_info.year || tv_and_season_folder.year },
          _position: "normal10",
        });
        await this.on_episode(tasks);
        await this.handle_episode(
          generate_episode({
            name: tv_and_season_folder.tv.name,
            original_name: tv_and_season_folder.tv.original_name,
            season: parsed_info.season,
            episode: parsed_info.episode,
          }),
          data
        );
        /**
         * @example
         * __root/name1/name1.s01.e01.mp4@@正常10
         */
        // this.emit(
        //   Events.Print,
        //   new ArticleLineNode({
        //     children: [
        //       new ArticleTextNode({
        //         text: "[](walk)[normal10]",
        //       }),
        //       new ArticleTextNode({
        //         color: "greenBright",
        //         text: parsed_info.season,
        //       }),
        //       new ArticleTextNode({
        //         color: "blueBright",
        //         text: tv_and_season_folder.tv.name,
        //       }),
        //     ],
        //   })
        // );
        // this.log(
        //   "[](walk)[normal10]",
        //   chalk.greenBright(parsed_info.season),
        //   chalk.blueBright(tv_and_season_folder.tv.name)
        // );
        return;
      }
      // (这里开始都是名字不匹配)如果有 tv_and_season.season
      if (tv_and_season_folder.season) {
        // 如果 tv_and_season.season 和 self.season 一样
        if (tv_and_season_folder.season.season === parsed_info.season) {
          const tasks = create_tasks({
            tv: parsed_info,
            season: parsed_info,
            episode: parsed_info,
            _position: "tip4",
          });
          await this.on_episode(tasks);
          await this.handle_episode(
            generate_episode({
              name: parsed_info.name,
              original_name: parsed_info.original_name,
              season: tv_and_season_folder.season.season,
              episode: parsed_info.episode,
            }),
            data
          );
          /**
           * @example
           * __root/name2/s01/name1.s01.e01.mp4@@需要提示4
           */
          const reason = `影片解析出名称为 '${parsed_info.name}' 和所在文件夹的名称 '${tv_and_season_folder.tv.name}' 不一致`;
          await this.on_warning({
            file_id,
            name,
            parent_paths,
            _position: "tip4",
          });
          // this.emit(
          //   Events.Print,
          //   new ArticleLineNode({
          //     children: [
          //       new ArticleTextNode({
          //         text: "[](walk)[tip4]",
          //       }),
          //       new ArticleTextNode({
          //         text: reason,
          //       }),
          //     ],
          //   })
          // );
          // this.log("[](walk)[tip4]", reason);
          return;
        }
        const tasks = create_tasks({
          tv: parsed_info,
          season: parsed_info,
          episode: parsed_info,
          _position: "tip5",
        });
        await this.on_episode(tasks);
        await this.handle_episode(
          generate_episode({
            name: parsed_info.name,
            original_name: parsed_info.original_name,
            season: parsed_info.season,
            episode: parsed_info.episode,
          }),
          data
        );
        /**
         * @example
         * __root/name2/s02/name1.s01.e01.mp4@@需要提示5
         */
        const reason = `影片解析出名称为 '${parsed_info.name}' 和所在文件夹的名称 '${tv_and_season_folder.tv.name}' 不一致；且解析出季数为 '${parsed_info.season}' 和所在文件夹的季数 '${tv_and_season_folder.season.season}' 也不一致`;
        await this.on_warning({
          file_id,
          name,
          parent_paths,
          _position: "tip5",
        });
        // this.emit(
        //   Events.Print,
        //   new ArticleLineNode({
        //     children: [
        //       new ArticleTextNode({
        //         text: "[](walk)[tip5]",
        //       }),
        //       new ArticleTextNode({
        //         text: reason,
        //       }),
        //     ],
        //   })
        // );
        // this.log("[](walk)[tip5]", reason);
        return;
      }
      const tasks = create_tasks({
        tv: parsed_info,
        season: parsed_info,
        episode: parsed_info,
        _position: "tip6",
      });
      await this.on_episode(tasks);
      await this.handle_episode(
        generate_episode({
          name: parsed_info.name,
          original_name: parsed_info.original_name,
          season: parsed_info.season,
          episode: parsed_info.episode,
        }),
        data
      );
      /**
       * @example
       * __root/name1/name2.s01.e01.mp4@@需要提示6
       */
      const reason = `影片解析出名称为 '${parsed_info.name}' 和所在文件夹的名称 '${tv_and_season_folder.tv.name}' 不一致`;
      await this.on_warning({
        file_id,
        name,
        parent_paths,
        _position: "tip6",
      });
      // this.emit(
      //   Events.Print,
      //   new ArticleLineNode({
      //     children: [
      //       new ArticleTextNode({
      //         text: "[](walk)[tip6]",
      //       }),
      //       new ArticleTextNode({
      //         text: reason,
      //       }),
      //     ],
      //   })
      // );
      // this.log("[](walk)[tip6]", reason);
      return;
    }
    if (is_img_file(name)) {
      const file: PendingFile = {
        type: "img",
        file_id,
        name,
        parent_paths,
      };
      data.push_relative_files([file]);
      // let finish = false;
      // if (this.relative_episodes.length !== 0) {
      //   for (let i = 0; i < this.relative_episodes.length; i += 1) {
      //     const episode = this.relative_episodes[i];
      //     const next_pending = await this.match_relative_file_with_episode(episode, [file]);
      //     if (next_pending.length === 0) {
      //       finish = true;
      //       this.relative_episodes = this.relative_episodes.filter((e) => e.file_id !== episode.file_id);
      //     }
      //   }
      //   return;
      // }
      // if (finish) {
      //   return;
      // }
      // this.pending_files.push(file);
      return;
    }
    if (is_subtitle_file(name)) {
      const file: PendingFile = {
        type: "subtitle",
        file_id,
        name,
        parent_paths,
      };
      data.push_relative_files([file]);
      // let finish = false;
      // if (this.relative_episodes.length !== 0) {
      //   for (let i = 0; i < this.relative_episodes.length; i += 1) {
      //     const episode = this.relative_episodes[i];
      //     const next_pending = await this.match_relative_file_with_episode(episode, [file]);
      //     if (next_pending.length === 0) {
      //       finish = true;
      //       this.relative_episodes = this.relative_episodes.filter((e) => e.file_id !== episode.file_id);
      //     }
      //   }
      //   return;
      // }
      // if (finish) {
      //   return;
      // }
      // this.pending_files.push(file);
      return;
    }
    if (is_nfo_file(name)) {
      const file: PendingFile = {
        type: "nfo",
        file_id,
        name,
        parent_paths,
      };
      if (["tvshow.nfo", "movie.nfo"].includes(name)) {
        data.parent?.set_can_save_episode();
      }
      data.push_relative_files([file]);
      // let finish = false;
      // console.log("is nfo file", this.relative_episodes);
      // if (this.relative_episodes.length !== 0) {
      //   for (let i = 0; i < this.relative_episodes.length; i += 1) {
      //     const episode = this.relative_episodes[i];
      //     const next_pending = await this.match_relative_file_with_episode(episode, [file]);
      //     if (next_pending.length === 0) {
      //       finish = true;
      //       this.relative_episodes = this.relative_episodes.filter((e) => e.file_id !== episode.file_id);
      //     }
      //   }
      //   return;
      // }
      // if (finish) {
      //   return;
      // }
      // this.pending_files.push(file);
      return;
    }
    // 没有匹配到预期的文件类型
    await this.on_warning({
      file_id,
      name,
      parent_paths,
      _position: "tip0",
    });
    return;
  }
  get_season_number_profile(parsed_info: ReturnType<typeof parse_filename_for_video>, parent: ParentFolder[] = []) {
    if (parsed_info.season) {
      return {
        number: parsed_info.season,
      };
    }
    const parent_season = this.get_season_number_from_parent(parent);
    if (parent_season) {
      return {
        file_id: parent_season.file_id,
        file_name: parent_season.file_name,
        number: parent_season.season,
      };
    }
    return {
      number: "S01",
    };
  }
  get_season_number_from_parent(parent: ParentFolder[] = []) {
    if (parent.length === 0) {
      return null;
    }
    const p = [...parent];
    while (p.length) {
      const v = p.pop();
      if (!v) {
        continue;
      }
      if (!v.season) {
        continue;
      }
      return v;
    }
    return null;
  }
  /** 从父文件夹寻找 season 和 tv 文件夹 */
  find_season_and_tv_folder(parent: ParentFolder[]) {
    let i = parent.length - 1;
    let matched_season_folder = null;
    // 是否要包含根目录，如果包含 i>=0。现在是不包含，所以「名称1/e01.mp4」不合法
    while (i > 0) {
      const v = parent[i];
      // console.log("find_season_and_tv_folder", i, v);
      const { name, original_name, season } = v;
      if (season && matched_season_folder === null) {
        if (name || original_name) {
          const result = {
            tv: v,
            season: v,
            year: v.year,
          };
          return result;
        }
        matched_season_folder = v;
        i -= 1;
        continue;
      }
      if (name || original_name) {
        // 找到有名字的文件夹，不会再继续向上找 season 文件夹了
        const result = {
          tv: v,
          season: matched_season_folder,
          year: matched_season_folder?.year || "",
        };
        return result;
      }
      i -= 1;
    }
    return null;
  }
  async handle_episode(episode: ArchivedEpisode, data: File) {
    data.push_episodes([episode]);
    // if (this.pending_files.length === 0) {
    //   return;
    // }
    // const next_pending_files = await this.match_relative_file_with_episode(episode, this.pending_files);
    // this.pending_files = next_pending_files;
  }
  /**
   * 遍历完一个文件夹后，对文件夹内索引到的 剧集相关文件(图片、nfo、字幕等)进行处理
   * 1、如果是字幕，就下载并关联对应剧集
   * 2、如果是图片
   * 3、如果是 nfo 文件，解析并组合 tvshow、season 和 episode 详情三个的关联关系，向外暴露 on_profile 回调
   */
  async handle_folder_after_walk(data: Folder | File) {
    if (data instanceof File) {
      return;
    }
    if (!data.can_save_episode) {
      return;
    }
    const relative_files = [...data.relative_files];
    const episodes = [...data.episodes];
    data.clear_episodes();
    data.clear_relative_files();
    const series_profile_file = relative_files.find((file) => {
      return ["tvshow.nfo"].includes(file.name);
    });
    if (series_profile_file) {
      // console.log("before read_nfo", series_profile_file);
      const series_profile_r = await this.read_nfo(series_profile_file, data);
      if (series_profile_r.error) {
        return Result.Err(series_profile_r.error.message);
      }
      const series_profile = series_profile_r.data;
      if (!series_profile) {
        return;
      }
      if (series_profile.type === MediaProfileTypesFromNFOFile.Series) {
        const episode_group_by_season: Record<
          // season order
          string,
          Record<
            // episode order
            string,
            EpisodeProfileInDrive
          >
        > = {};
        // const episode_nfo_files: {
        //   file_id: string;
        //   name: string;
        //   parent_paths: string;
        // }[] = [];
        // const episode_thumb_files: {
        //   file_id: string;
        //   name: string;
        //   parent_paths: string;
        // }[] = [];
        // const subtitle_files: {
        //   file_id: string;
        //   name: string;
        //   parent_paths: string;
        // }[] = [];
        for (let i = 0; i < episodes.length; i += 1) {
          await (async () => {
            const episode = episodes[i];
            const files = await this.find_relative_episode_files(episode, relative_files);
            const episode_profile_files = files.filter((file) => {
              return is_nfo_file(file.name);
            });
            // episode_nfo_files.push(...episode_profile_files);
            const episode_thumb_files = files.filter((file) => {
              return is_img_file(file.name);
            });
            // episode_thumb_files.push(...image_files2);
            const episode_subtitle_files = files.filter((file) => {
              return is_subtitle_file(file.name);
            });
            // console.log('episode_subtitle_files', episode_subtitle_files.length);
            // subtitle_files.push(...subtitle_files2);
            if (episode_profile_files.length === 0) {
              console.log(`剧集 ${episode.name}/${episode.episode} 没有关联的详情文件`);
              return;
            }
            // 一个剧集有多个详情文件，这种情况取第一个吧，简单点
            const episode_profile_file = episode_profile_files[0];
            // console.log(episode_profile_file);
            const r = await this.read_nfo(episode_profile_file, data);
            if (r.error) {
              console.log(`读取 nfo 文件 '${r.error.message}' 失败，因为`, r.error.message);
              return;
            }
            const profile = r.data;
            if (profile.type !== MediaProfileTypesFromNFOFile.Episode) {
              console.log(`详情文件 '${episode_profile_file.file_id}' 不是剧集详情文件`);
              return;
            }
            const { name, overview, air_date, season, runtime } = profile;
            let order = profile.order;
            // console.log("content from episode nfo file", episode.file_name, season, order);
            if (!order) {
              // 没有第几集信息，一般不可能
              console.log(`详情文件 '${episode_profile_file.file_id}' 中缺少剧集集数信息`);
              return;
            }
            // 从文件名判断是第几季
            const { season: season_str, episode: episode_str } = parse_filename_for_video(episode_profile_file.name, [
              "name",
              "original_name",
              "season",
              "episode",
              "year",
            ]);
            if (episode_str) {
              // 优先使用文件名上面的 episode_number，是为了兼容单测时所有 episode nfo 文件是同一个，导致集数都相同的问题
              const episode_number = format_episode_number(episode_str);
              const n = episode_number.match(/E([0-9]{1,})/);
              if (n) {
                order = Number(n[1]);
              }
            }
            const season_number = (() => {
              if (season) {
                return season;
              }
              if (season_str) {
                const season_number = format_season_number(season_str);
                const n = season_number.match(/S([0-9]{1,})/);
                if (n) {
                  return Number(n[0]);
                }
              }
              return null;
            })();
            if (season_number === null) {
              console.log(`详情文件 '${episode_profile_file.file_id}' 中缺少季数信息且文件名中也未解析出季数`);
              return;
            }
            // console.log("before save episode profiles");
            const s = String(season_number);
            const o = String(order);
            episode_group_by_season[s] = episode_group_by_season[s] || {};
            // console.log(`save episode to episode_profiles ${s}/${o}`);
            episode_group_by_season[s][o] = {
              id: `unknown_series/${s}/${o}`,
              name,
              overview,
              air_date,
              episode_number: order,
              season_number,
              runtime,
              still_path: episode_thumb_files.length ? episode_thumb_files[0] : null,
              subtitle_files: episode_subtitle_files,
              relative_source_id: episode.file_id,
            };
          })();
        }
        const season_profile_files = relative_files.filter((file) => {
          return file.name.match(/[sS]eason[0-9]{0,}\.nfo/);
        });
        const season_profiles: SeasonProfileInDrive[] = [];
        for (let i = 0; i < season_profile_files.length; i += 1) {
          await (async () => {
            const season_profile_file = season_profile_files[i];
            const { name, parent_paths } = season_profile_file;
            const r = await this.read_nfo(season_profile_file, data);
            if (r.error) {
              console.log(`读取 nfo 文件 '${name}' 失败，因为`, r.error.message);
              return;
            }
            const season_profile = r.data;
            if (season_profile.type !== MediaProfileTypesFromNFOFile.Season) {
              console.log(`详情文件 '${name}' 不是季详情文件`);
              return;
            }
            if (!season_profile.order) {
              const season_num = (() => {
                const n = name.match(/season([0-9]{1,})/);
                if (n) {
                  return Number(n[0]);
                }
                const parent_pathname = parent_paths.split("/").pop();
                if (parent_pathname) {
                  const r1 = parent_pathname.match(/[sS]([0-9]{1,})/);
                  if (r1) {
                    return Number(r1[0]);
                  }
                  const r2 = parent_pathname.match(/[sS]eason([0-9]{1,})/);
                  if (r2) {
                    return Number(r2[0]);
                  }
                }
                return null;
              })();
              season_profile.order = season_num;
            }
            if (!season_profile.order) {
              console.log(`详情文件 '${season_profile_file.file_id}' 中缺少季数信息且文件名中也未解析出季数`);
              return;
            }
            const episode_map = episode_group_by_season[season_profile.order];
            // console.log("episode map of season", season_profile.order, episode_group_by_season);
            season_profiles.push({
              id: `unknown_series/${season_profile.order}`,
              name: season_profile.name,
              overview: season_profile.overview,
              season_number: season_profile.order,
              air_date: season_profile.air_date,
              poster_path: (() => {
                if (season_profile.poster_path && season_profile.poster_path.startsWith("http")) {
                  return {
                    // 网络图片
                    file_id: season_profile.poster_path,
                  };
                }
                const file = relative_files.find((file) => {
                  return file.name.match(/^season[0-9]{1,}-poster/);
                });
                if (file) {
                  return {
                    // 云盘内文件
                    file_id: file.file_id,
                  };
                }
                return null;
              })(),
              backdrop_path: (() => {
                const file = relative_files.find((file) => {
                  return file.name.match(/^fanart\./);
                });
                if (file) {
                  return {
                    file_id: file.file_id,
                  };
                }
                return null;
              })(),
              vote_average: season_profile.rating,
              episode_count: episode_map ? Object.keys(episode_map).length : 0,
              episodes: episode_map ? Object.values(episode_map) : [],
            });
          })();
        }
        const { name, original_name, overview, poster_path, backdrop_path, air_date, tmdb_id, tvdb_id, imdb_id } =
          series_profile;
        const id = tmdb_id || imdb_id || imdb_id || "unknown_movie";
        // console.log("series_profile_payload", season_profiles);
        const seasons = (() => {
          if (season_profiles.length) {
            return season_profiles;
          }
          // 没有 season.nfo 文件，有 S01E01.episode.nfo 文件
          const seasons = Object.keys(episode_group_by_season);
          if (seasons.length === 0) {
            return [];
          }
          return seasons.map((season_number) => {
            const episode_map = episode_group_by_season[season_number];
            const episodes = Object.values(episode_map);
            return {
              id: `unknown_series/${season_number}`,
              name: `第 ${season_number} 季`,
              overview: null,
              season_number: Number(season_number),
              air_date: (() => {
                const first = episodes.find((e) => e.episode_number === 1);
                if (first) {
                  return first.air_date;
                }
                return null;
              })(),
              poster_path: (() => {
                const file = relative_files.find((file) => {
                  return file.name.match(/^season[0-9]{1,}-poster/);
                });
                if (file) {
                  return {
                    // 云盘内文件
                    file_id: file.file_id,
                  };
                }
                return null;
              })(),
              backdrop_path: (() => {
                const file = relative_files.find((file) => {
                  return file.name.match(/^fanart\./);
                });
                if (file) {
                  return {
                    file_id: file.file_id,
                  };
                }
                return null;
              })(),
              vote_average: null,
              episode_count: episodes.length,
              episodes,
            };
          });
        })();
        const series_poster_path = (() => {
          if (poster_path && poster_path.startsWith("http")) {
            return {
              // 网络图片
              file_id: poster_path,
            };
          }
          const file = relative_files.find((file) => {
            return file.name.match(/^poster\./);
          });
          if (file) {
            return {
              // 云盘内文件
              file_id: file.file_id,
            };
          }
          return null;
        })();
        const series_backdrop_path = (() => {
          if (backdrop_path && backdrop_path.startsWith("http")) {
            return {
              // 网络图片
              file_id: backdrop_path,
            };
          }
          const file = relative_files.find((file) => {
            return file.name.match(/^fanart\./);
          });
          if (file) {
            return {
              file_id: file.file_id,
            };
          }
          return null;
        })();
        const series_profile_payload: MediaProfileInDrive = {
          type: MediaTypes.Season,
          id,
          name,
          original_name,
          overview,
          poster_path: series_poster_path,
          backdrop_path: series_backdrop_path,
          first_air_date: air_date,
          number_of_seasons: seasons.length,
          seasons: seasons.map((s) => {
            const { id: season_id, episodes } = s;
            // console.log("replace season_id", season_id, id);
            return {
              id: season_id.replace(/unknown_series/, id),
              name: s.name || name,
              overview: s.overview || overview,
              season_number: s.season_number,
              poster_path: s.poster_path || series_poster_path,
              backdrop_path: s.backdrop_path || series_backdrop_path,
              air_date: s.air_date || air_date,
              vote_average: s.vote_average,
              episode_count: s.episode_count,
              episodes: episodes.map((e) => {
                const { id: episode_id, ...rest } = e;
                // console.log("replace episode_id", episode_id, season_id, id);
                return {
                  id: episode_id.replace(/unknown_series/, id),
                  ...rest,
                };
              }),
            };
          }),
          origin_country: [],
          next_episode_to_air: null,
          in_production: false,
          genres: [],
          tmdb_id,
          tvdb_id,
          imdb_id,
        };
        // 通知新增电视剧详情
        await this.on_profile(series_profile_payload);
      }
      if (series_profile.type === MediaProfileTypesFromNFOFile.Movie) {
        // 通知新增电影详情
        const {
          name,
          original_name,
          overview,
          runtime,
          poster_path,
          backdrop_path,
          air_date,
          tmdb_id,
          tvdb_id,
          imdb_id,
        } = series_profile;
        const id = tmdb_id || imdb_id || imdb_id || "unknown_movie";
        const movie_profile_payload: MediaProfileInDrive = {
          type: MediaTypes.Movie,
          id,
          name,
          original_name,
          overview,
          poster_path: (() => {
            if (poster_path && poster_path.startsWith("http")) {
              return {
                file_id: poster_path,
              };
            }
            return null;
          })(),
          backdrop_path: (() => {
            if (backdrop_path && backdrop_path.startsWith("http")) {
              return {
                file_id: backdrop_path,
              };
            }
            return null;
          })(),
          runtime,
          air_date,
          origin_country: [],
          tmdb_id,
          tvdb_id,
          imdb_id,
        };
        await this.on_profile(movie_profile_payload);
      }
    }
    const movie_profile_file = relative_files.find((file) => {
      return ["movie.nfo"].includes(file.name);
    });
    if (movie_profile_file) {
      // ...
    }
  }
  async find_relative_episode_files(
    episode: ArchivedEpisode,
    pending_files: {
      file_id: string;
      name: string;
      parent_paths: string;
      type: "subtitle" | "img" | "nfo";
    }[]
  ) {
    const { file_name } = episode;
    /**
     * 第一类相关，名字一样
     * 德里罪案S01E05.mkv
     * 德里罪案S01E05.nfo
     * 去掉后缀，对比两个名字是否一样
     */
    const relative_files1 = pending_files.filter((file) => {
      const cleaned_name = file_name.replace(/\.[a-zA-Z0-9]{1,}$/, "");
      const is_relative = file.name.includes(cleaned_name);
      if (is_relative) {
        return true;
      }
      return false;
    });
    return relative_files1;
  }
  has_same_name(tv: { name: string; original_name: string }, parsed_info: { name: string; original_name: string }) {
    if (tv.name && parsed_info.name && tv.name === parsed_info.name) {
      return true;
    }
    if (tv.original_name && parsed_info.original_name && tv.original_name === parsed_info.original_name) {
      return true;
    }
    return false;
  }
  set_delay(delay: number) {
    this.delay = delay;
  }
  clear_delay() {
    this.delay = undefined;
  }
  async read_nfo(file: PendingFile, data: Folder) {
    const process = new NfoFileProcessor({
      file_id: file.file_id,
      client: data.client,
    });
    const r = await process.fetch_content();
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const content = r.data;
    // console.log("nfo file", file.name, "content");
    const r2 = await process.parse(file.name, content);
    if (r2.error) {
      // console.log("parse nfo content failed, because", r2.error.message, { file: file.name });
      return Result.Err(r2.error.message);
    }
    const profile = r2.data;
    // console.log("parse nfo content success");
    return Result.Ok(profile);
  }
  stop() {
    if (this.need_stop) {
      return;
    }
    this.need_stop = true;
  }
  // log(...args: unknown[]) {
  // }

  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
  on_stop(handler: Handler<TheTypesOfEvents[Events.Stop]>) {
    return this.on(Events.Stop, handler);
  }
  // on_file(handler: Handler<TheTypesOfEvents[Events.File]>) {
  //   return this.on(Events.File, handler);
  // }
  // on_episode(handler: Handler<TheTypesOfEvents[Events.Episode]>) {
  //   return this.on(Events.Episode, handler);
  // }
  // on_movie(handler: Handler<TheTypesOfEvents[Events.Movie]>) {
  //   return this.on(Events.Movie, handler);
  // }
  // on_error(handler: Handler<TheTypesOfEvents[Events.Error]>) {
  //   return this.on(Events.Error, handler);
  // }
  // on_warning(handler: Handler<TheTypesOfEvents[Events.Warning]>) {
  //   return this.on(Events.Warning, handler);
  // }
}
