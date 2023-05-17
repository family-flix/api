/**
 * @file 文件夹遍历器
 */
import chalk from "chalk";

import { AliyunDriveFile, AliyunDriveFolder } from "@/domains/aliyundrive/folder";
import { Result } from "@/types";
import { is_video_file, parse_filename_for_video, noop, promise_noop, sleep } from "@/utils";

export type SearchedEpisode = {
  tv: {
    /** 文件夹/文件 id，如果该 tv name 来自 episode，该字段就会为空 */
    file_id?: string;
    /** 文件夹/文件名，如果该 tv name 来自 episode，该字段就会为空 */
    file_name?: string;
    /** tv 名称 */
    name: string;
    original_name: string;
  };
  season: {
    /** 文件夹/文件 id，如果该 season 来自 episode，该字段就会为空 */
    file_id?: string;
    /** 文件夹/文件名，如果该 season 来自 episode，该字段就会为空 */
    file_name?: string;
    /** 第几季 */
    season: string;
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
    /** 第几集 */
    episode: string;
    /** 大小（单位字节）*/
    size: number;
  };
  /** 代码中走了哪个分支，方便定位问题 */
  _position?: string;
};
export type ParentFolder = Pick<ReturnType<typeof parse_filename_for_video>, "name" | "original_name" | "season"> & {
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
const DEFAULT_SEASON_NUMBER = "S01";
/**
 * 推断一个目录内部的所有文件是否为一个剧集
 */
export class FolderWalker {
  /**
   * 索引到所有影片
   * @deprecated
   */
  episodes: ArchivedEpisode[] = [];
  /** 从哪个文件夹开始遍历的 */
  start_folder_id?: string;
  /** 是否需要终止 */
  stop = false;
  /** 每次调用列表接口后，是否需要延迟一会 */
  delay?: number;
  /** 在访问到文件夹/文件时，判断是否要处理（解析或读取子文件夹） */
  filter?: (options: {
    file_id: string;
    name: string;
    type: string;
    parent_file_id: string;
    parent_paths: string;
  }) => Promise<boolean>;
  /** 读取到一个文件夹/文件时的回调 */
  on_file: (folder: {
    file_id: string;
    name: string;
    type: "file" | "folder";
    size?: number;
    parent_file_id: string;
    parent_paths: string;
  }) => Promise<void> = promise_noop;
  /** 找到一个剧集时的回调 */
  on_episode: (tasks: SearchedEpisode) => Promise<void> = promise_noop;
  /** 找到一个电影时的回调 */
  on_movie: (movie: {}) => Promise<void> = promise_noop;
  /** 解析到影片文件但解析失败时的回调 */
  on_error: (file: { file_id: string; name: string; parent_paths: string; _position: string }) => void = noop;
  on_warning: (file: { file_id: string; name: string; parent_paths: string; _position: string }) => void = noop;

  constructor() {}
  /**
   * 递归遍历给定的文件夹
   */
  async walk(data: AliyunDriveFolder | AliyunDriveFile, parent: ParentFolder[] = []) {
    const { file_id, type, name, size, parent_file_id } = data;
    const parent_paths = parent.map((p) => p.file_name).join("/");
    const parent_ids = parent.map((p) => p.file_id).join("/");
    const filepath = parent_paths + "/" + name;
    this.log("\n");
    this.log(
      "[](walk)" + chalk.yellowBright("begin"),
      chalk.gray(parent_paths) + chalk.magenta("/") + chalk.magenta(name),
      file_id
    );
    if (this.stop) {
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
    await this.on_file({
      file_id,
      name,
      parent_file_id,
      parent_paths,
      type,
      size,
    });
    if (type === "folder") {
      const parsed_info = parse_filename_for_video(name);
      const folder = data as AliyunDriveFolder;
      await (async () => {
        do {
          if (this.delay) {
            await sleep(this.delay);
          }
          const r = await folder.next();
          if (r.error) {
            // @todo listen error and notice
            continue;
          }
          for (let i = 0; i < r.data.length; i += 1) {
            if (this.stop) {
              return;
            }
            const file = r.data[i];
            const { name: parsed_name, original_name, season } = parsed_info;
            const parent_folders = parent
              .map((p) => {
                return { ...p };
              })
              .concat({
                file_id,
                file_name: name,
                name: parsed_name,
                original_name,
                season,
              });
            await this.walk(file, parent_folders);
          }
        } while (folder.next_marker);
      })();
      return;
    }
    if (!is_video_file(name)) {
      await this.on_warning({
        file_id,
        name,
        parent_paths,
        _position: "tip0",
      });
      return;
    }
    const parsed_info = parse_filename_for_video(name);
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
    // const start_folder_id = this.start_folder_id;
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
        season: string;
      };
      episode: {
        episode: string;
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
          season: season.season,
        },
        episode: {
          file_id,
          parent_file_id,
          parent_paths,
          parent_ids,
          file_name: name,
          episode: episode.episode,
          size,
        },
        _position,
        // _start_folder_id: start_folder_id,
      };
    }

    if (!parsed_info.episode) {
      if (!parsed_info.name && !parsed_info.original_name) {
        const reason = "影片文件未包含集数信息";
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
        this.log(chalk.redBright("[ERROR]"), "error1", name, reason);
        return;
      }
      await this.on_movie({
        file_id,
        file_name: name,
        name,
        parent_paths,
        parent_file_id,
        size,
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
        const tv_and_season_folder = this.find_season_and_tv_folder(parent);
        // log('[]', parent, tv_and_season_folder);
        if (tv_and_season_folder) {
          if (tv_and_season_folder.season) {
            const tasks = create_tasks({
              tv: tv_and_season_folder.tv,
              season: tv_and_season_folder.season,
              episode: parsed_info,
              _position: "normal1",
            });
            await this.on_episode(tasks);
            this.add_episode(
              generate_episode({
                name: tv_and_season_folder.tv.name,
                original_name: tv_and_season_folder.tv.original_name,
                season: tv_and_season_folder.season.season,
                episode: parsed_info.episode,
              })
            );
            /**
             * @example
             * __root/name1/s01/e01.mp4__@@正常1
             */
            this.log(
              "[](walk)[normal1]",
              chalk.greenBright(tv_and_season_folder.season.season),
              chalk.blueBright(tv_and_season_folder.tv.name)
            );
            return;
          }
          const tasks = create_tasks({
            tv: tv_and_season_folder.tv,
            season: {
              season: DEFAULT_SEASON_NUMBER,
            },
            episode: parsed_info,
            _position: "normal2",
          });
          await this.on_episode(tasks);
          this.add_episode(
            generate_episode({
              name: tv_and_season_folder.tv.name,
              original_name: tv_and_season_folder.tv.original_name,
              season: DEFAULT_SEASON_NUMBER,
              episode: parsed_info.episode,
            })
          );
          /**
           * @example
           * __root/name1/e01.mp4__@@正常2
           */
          this.log(
            "[](walk)[normal2]",
            chalk.greenBright(DEFAULT_SEASON_NUMBER),
            chalk.blueBright(tv_and_season_folder.tv.name)
          );
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
        this.log(chalk.redBright("[ERROR]"), "error3", name, reason);
        return;
      }
      // episode 有名字
      const tv_and_season_folder = this.find_season_and_tv_folder(parent);
      if (tv_and_season_folder) {
        if (this.has_same_name(tv_and_season_folder.tv, parsed_info)) {
          if (tv_and_season_folder.season) {
            const tasks = create_tasks({
              tv: tv_and_season_folder.tv,
              season: tv_and_season_folder.season,
              episode: parsed_info,
              _position: "normal3",
            });
            await this.on_episode(tasks);
            this.add_episode(
              generate_episode({
                name: tv_and_season_folder.tv.name,
                original_name: tv_and_season_folder.tv.original_name,
                season: tv_and_season_folder.season.season,
                episode: parsed_info.episode,
              })
            );
            /**
             * @example
             * return __root/name1/s01/name1.e01.mp4@@正常3
             */
            this.log(
              "[](walk)[normal3]",
              chalk.greenBright(tv_and_season_folder.season.season),
              chalk.blueBright(tv_and_season_folder.tv.name)
            );
            return;
          }
          const tasks = create_tasks({
            tv: tv_and_season_folder.tv,
            season: {
              season: DEFAULT_SEASON_NUMBER,
            },
            episode: parsed_info,
            _position: "normal4",
          });
          await this.on_episode(tasks);
          this.add_episode(
            generate_episode({
              name: tv_and_season_folder.tv.name,
              original_name: tv_and_season_folder.tv.original_name,
              season: DEFAULT_SEASON_NUMBER,
              episode: parsed_info.episode,
            })
          );
          /**
           * @example
           * __root/name1/name1.e01.mp4@@正常4
           */
          this.log(
            "[](walk)[normal4]",
            chalk.greenBright(DEFAULT_SEASON_NUMBER),
            chalk.blueBright(tv_and_season_folder.tv.name)
          );
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
        this.add_episode(
          generate_episode({
            name: parsed_info.name,
            original_name: parsed_info.original_name,
            season: "S01",
            episode: parsed_info.episode,
          })
        );
        /**
         * @example
         * __root/name1/name2.e01.mp4@@需要提示1
         */
        const reason = `影片解析出的名字 '${parsed_info.name}' 和所在文件夹的名字 '${tv_and_season_folder.tv.name}' 不一致`;
        await this.on_warning({
          file_id,
          name,
          parent_paths,
          _position: "tip1",
        });
        this.log("[](walk)[tip1]", reason);
        return;
      }
      const tasks = create_tasks({
        tv: parsed_info,
        season: { season: DEFAULT_SEASON_NUMBER },
        episode: parsed_info,
        _position: "normal5",
      });
      await this.on_episode(tasks);
      this.add_episode(
        generate_episode({
          name: parsed_info.name,
          original_name: parsed_info.original_name,
          season: DEFAULT_SEASON_NUMBER,
          episode: parsed_info.episode,
        })
      );
      /**
       * @example
       * __root/empty/name1.e01.mp4 or __root/empty/s01/name.e01.mp4@@正常5
       */
      this.log("[](walk)[normal5]", chalk.greenBright(DEFAULT_SEASON_NUMBER), chalk.blueBright(parsed_info.name));
      return;
    }
    // 如果没有 self.name
    if (!parsed_info.name && !parsed_info.original_name) {
      const tv_and_season_folder = this.find_season_and_tv_folder(parent);
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
        this.log(chalk.redBright("[ERROR]"), "error5", name, reason);
        return;
      }
      // 如果有 tv_and_season.season
      if (tv_and_season_folder.season) {
        // 如果 tv_and_season.season 和 self.season 一样
        if (tv_and_season_folder.season.season === parsed_info.season) {
          const tasks = create_tasks({
            tv: tv_and_season_folder.tv,
            season: tv_and_season_folder.season,
            episode: parsed_info,
            _position: "normal6",
          });
          await this.on_episode(tasks);
          this.add_episode(
            generate_episode({
              name: tv_and_season_folder.tv.name,
              original_name: tv_and_season_folder.tv.original_name,
              season: tv_and_season_folder.season.season,
              episode: parsed_info.episode,
            })
          );
          /**
           * @example
           * __root/name1/s01/s01.e01.mp4@@正常6
           */
          this.log(
            "[](walk)[normal6]",
            chalk.greenBright(tv_and_season_folder.season.season),
            chalk.blueBright(tv_and_season_folder.tv.name)
          );
          return;
        }
        const tasks = create_tasks({
          tv: tv_and_season_folder.tv,
          season: { season: parsed_info.season },
          episode: parsed_info,
          _position: "tip2",
        });
        await this.on_episode(tasks);
        this.add_episode(
          generate_episode({
            name: tv_and_season_folder.tv.name,
            original_name: tv_and_season_folder.tv.original_name,
            season: parsed_info.season,
            episode: parsed_info.episode,
          })
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
        this.log("[](walk)[tip2]", reason);
        return;
      }
      const tasks = create_tasks({
        tv: tv_and_season_folder.tv,
        season: parsed_info,
        episode: parsed_info,
        _position: "normal7",
      });
      await this.on_episode(tasks);
      this.add_episode(
        generate_episode({
          name: tv_and_season_folder.tv.name,
          original_name: tv_and_season_folder.tv.original_name,
          season: parsed_info.season,
          episode: parsed_info.episode,
        })
      );
      /**
       * @example
       * __root/name1/s01.e01.mp4@@正常7
       */
      this.log(
        "[](walk)[normal7]",
        chalk.greenBright(parsed_info.season),
        chalk.blueBright(tv_and_season_folder.tv.name)
      );
      return;
    }
    const tv_and_season_folder = this.find_season_and_tv_folder(parent);
    // 如果没有 tv_and_season
    if (!tv_and_season_folder) {
      const tasks = create_tasks({
        tv: parsed_info,
        season: parsed_info,
        episode: parsed_info,
        _position: "normal8",
      });
      await this.on_episode(tasks);
      this.add_episode(
        generate_episode({
          name: parsed_info.name,
          original_name: parsed_info.original_name,
          season: parsed_info.season,
          episode: parsed_info.episode,
        })
      );
      /**
       * @example
       * __root/empty/name1.s01.e01.mp4 or __root/empty/s02/name1.s01.e01.mp4@@正常8
       */
      this.log("[](walk)[normal8]", chalk.greenBright(parsed_info.season), chalk.blueBright(parsed_info.name));
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
            episode: parsed_info,
            _position: "normal9",
          });
          await this.on_episode(tasks);
          this.add_episode(
            generate_episode({
              name: tv_and_season_folder.tv.name,
              original_name: tv_and_season_folder.tv.original_name,
              season: tv_and_season_folder.season.season,
              episode: parsed_info.episode,
            })
          );
          /**
           * @example
           * __root/name1/s01/name1.s01.e01.mp4@@正常9
           */
          this.log(
            "[](walk)[normal9]",
            chalk.greenBright(tv_and_season_folder.season.season),
            chalk.blueBright(tv_and_season_folder.tv.name)
          );
          return;
        }
        const tasks = create_tasks({
          tv: tv_and_season_folder.tv,
          season: parsed_info,
          episode: parsed_info,
          _position: "tip3",
        });
        await this.on_episode(tasks);
        this.add_episode(
          generate_episode({
            name: tv_and_season_folder.tv.name,
            original_name: tv_and_season_folder.tv.original_name,
            season: parsed_info.season,
            episode: parsed_info.episode,
          })
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
        this.log("[](walk)[tip3]", reason);
        return;
      }
      const tasks = create_tasks({
        tv: tv_and_season_folder.tv,
        season: parsed_info,
        episode: parsed_info,
        _position: "normal10",
      });
      await this.on_episode(tasks);
      this.add_episode(
        generate_episode({
          name: tv_and_season_folder.tv.name,
          original_name: tv_and_season_folder.tv.original_name,
          season: parsed_info.season,
          episode: parsed_info.episode,
        })
      );
      /**
       * @example
       * __root/name1/name1.s01.e01.mp4@@正常10
       */
      this.log(
        "[](walk)[normal10]",
        chalk.greenBright(parsed_info.season),
        chalk.blueBright(tv_and_season_folder.tv.name)
      );
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
        this.add_episode(
          generate_episode({
            name: parsed_info.name,
            original_name: parsed_info.original_name,
            season: tv_and_season_folder.season.season,
            episode: parsed_info.episode,
          })
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
        this.log("[](walk)[tip4]", reason);
        return;
      }
      const tasks = create_tasks({
        tv: parsed_info,
        season: parsed_info,
        episode: parsed_info,
        _position: "tip5",
      });
      await this.on_episode(tasks);
      this.add_episode(
        generate_episode({
          name: parsed_info.name,
          original_name: parsed_info.original_name,
          season: parsed_info.season,
          episode: parsed_info.episode,
        })
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
      this.log("[](walk)[tip5]", reason);
      return;
    }
    const tasks = create_tasks({
      tv: parsed_info,
      season: parsed_info,
      episode: parsed_info,
      _position: "tip6",
    });
    await this.on_episode(tasks);
    this.add_episode(
      generate_episode({
        name: parsed_info.name,
        original_name: parsed_info.original_name,
        season: parsed_info.season,
        episode: parsed_info.episode,
      })
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
    this.log("[](walk)[tip6]", reason);
    return;
  }
  /**
   * 开始检测
   */
  async detect(data: AliyunDriveFolder) {
    this.start_folder_id = data.file_id;
    await this.walk(data);
    return Result.Ok(this.episodes);
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
        };
        return result;
      }
      i -= 1;
    }
    return null;
  }
  add_episode(episode: ArchivedEpisode) {
    // this.episodes.push(episode);
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
  log(...args: unknown[]) {
    // const show_log = false;
    //   if (!show_log) {
    //     return;
    //   }
    // console.log(...args);
  }
}
