/**
 * @file 电影文件解析
 */
import { Handler } from "mitt";

import { FileType } from "@/constants";
import { BaseDomain } from "@/domains/base";
import { SearchedMovie } from "@/domains/walker";
import { DatabaseStore } from "@/domains/store";
import { Result } from "@/types";

import { is_movie_changed } from "./utils";

enum Events {
  AddMovie,
}
type TheTypesOfEvents = {
  [Events.AddMovie]: { name: string; original_name: string | null };
};
type MovieFileProcessorProps = {
  movie: SearchedMovie;
  user_id: string;
  drive_id: string;
  task_id?: string;
  store: DatabaseStore;
  on_add_movie?: (movie: { name: string; original_name: string | null }) => void;
};

export class MovieFileProcessor extends BaseDomain<TheTypesOfEvents> {
  store: DatabaseStore;
  movie: SearchedMovie;
  options: {
    user_id: string;
    drive_id: string;
    task_id?: string;
  };

  constructor(options: Partial<{} & MovieFileProcessorProps> = {}) {
    super();

    const { movie, user_id, drive_id, task_id, store, on_add_movie } = options;
    if (!store) {
      throw new Error("缺少数据库实例");
    }
    if (!user_id) {
      throw new Error("缺少用户 id");
    }
    if (!drive_id) {
      throw new Error("缺少云盘 id");
    }
    if (!movie) {
      throw new Error("缺少电影信息");
    }
    this.movie = movie;
    this.store = store;
    this.options = {
      user_id,
      drive_id,
      task_id,
    };
    if (on_add_movie) {
      this.on_add_movie(on_add_movie);
    }
  }

  /**
   * 处理 DriveWalker 吐出的 episode 信息
   * 创建不重复的 parsed_tv、parsed_season 和 parsed_episode
   */
  async run() {
    const data = this.movie;
    const { file_id, file_name, name, original_name, parent_paths, parent_file_id, size } = data;
    const store = this.store;
    const { drive_id, user_id } = this.options;
    const prefix = `${parent_paths}/${file_name}`;
    // log(`[${prefix}]`, "开始处理视频文件");
    const existing_movie_res = await store.find_parsed_movie({
      file_id,
    });
    if (existing_movie_res.error) {
      // log("[ERROR]find episode request failed", existing_episode_res.error.message);
      // log(`[${prefix}]`, "判断视频文件是否存在失败");
      return Result.Err(existing_movie_res.error);
    }
    const existing_movie = existing_movie_res.data;
    function log(...args: unknown[]) {
      // if (!tv.name.includes("十八年后")) {
      //   return;
      // }
      // console.log(...args);
    }

    if (!existing_movie) {
      /**
       * ----------------------------------------
       * 电影文件不存在，新增电影
       * ----------------------------------------
       */
      log(`[${prefix}]`, "是新视频文件");
      const add_movie_res = await store.add_parsed_movie({
        name,
        original_name,
        file_id,
        file_name,
        parent_file_id,
        parent_paths,
        type: FileType.File,
        size,
        user_id,
        drive_id,
      });
      if (add_movie_res.error) {
        // log(`[${prefix}]`, "视频文件保存失败", add_episode_res.error.message);
        return Result.Err(add_movie_res.error);
      }
      this.emit(Events.AddMovie, {
        ...add_movie_res.data,
      });
      //       log(`[${prefix}]`, "视频文件保存成功");
      return Result.Ok(null);
    }
    /**
     * ----------------------------------------
     * 电影文件已存在，判断是否需要更新
     * ----------------------------------------
     */
    log("\n");
    log(`[${prefix}]`, "电影文件已存在，判断是否需要更新");
    const movie_payload: {
      id: string;
      body: Record<string, string | number>;
    } = {
      id: existing_movie.id,
      body: {},
    };
    if (is_movie_changed(existing_movie, data)) {
      movie_payload.body.name = data.name;
      movie_payload.body.original_name = data.original_name;
      movie_payload.body.file_name = data.file_name;
      movie_payload.body.parent_file_id = data.parent_file_id;
      movie_payload.body.parent_paths = data.parent_paths;
      movie_payload.body.size = data.size;
      movie_payload.body.can_search = 1;
    }
    if (Object.keys(movie_payload.body).length !== 0) {
      log(`[${prefix}]`, "该视频文件信息发生改变，变更后的内容为", movie_payload.id, movie_payload.body);
      const update_episode_res = await store.update_parsed_movie(movie_payload.id, movie_payload.body);
      if (update_episode_res.error) {
        log(`[${prefix}]`, "视频文件更新失败", update_episode_res.error.message);
        return update_episode_res;
      }
      log(`[${prefix}]`, "视频文件更新成功");
      return Result.Ok(null);
    }
    // log(`[${prefix}]`, "视频文件没有变更");
    return Result.Ok(null);
  }

  on_add_movie(handler: Handler<TheTypesOfEvents[Events.AddMovie]>) {
    return this.on(Events.AddMovie, handler);
  }
}
