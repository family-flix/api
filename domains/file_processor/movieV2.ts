/**
 * @file 电影文件解析
 */
import dayjs from "dayjs";

import { MediaTypes } from "@/constants";
import { BaseDomain, Handler } from "@/domains/base";
import { SearchedMovie } from "@/domains/walker";
import { DatabaseStore } from "@/domains/store";
import { ParsedMediaSourceRecord } from "@/domains/store/types";
import { Article, ArticleLineNode } from "@/domains/article";
import { Result } from "@/types";
import { r_id } from "@/utils";

import { is_media_change, is_movie_media_source_change } from "./utils";

enum Events {
  AddMovie,
  Print,
}
type TheTypesOfEvents = {
  [Events.AddMovie]: { name: string; original_name: string | null };
  [Events.Print]: ArticleLineNode;
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
    const existing_source = await store.prisma.parsed_media_source.findFirst({
      where: {
        file_id,
        user_id: this.options.user_id,
      },
    });
    function log(...args: unknown[]) {
      // if (!tv.name.includes("十八年后")) {
      //   return;
      // }
      // console.log(...args);
    }
    if (!existing_source) {
      /**
       * ----------------------------------------
       * 电影文件不存在，新增电影
       * ----------------------------------------
       */
      // log(`[${prefix}]`, "是新视频文件");
      const created_parsed_media = await this.add_parsed_media(data);
      const created = await store.prisma.parsed_media_source.create({
        data: {
          id: r_id(),
          type: MediaTypes.Movie,
          name,
          original_name,
          file_id,
          file_name,
          parent_file_id,
          parent_paths,
          size,
          parsed_media_id: created_parsed_media.id,
          user_id,
          drive_id,
        },
      });
      this.emit(Events.AddMovie, created);
      return Result.Ok(created);
    }
    /**
     * ----------------------------------------
     * 电影文件已存在，判断是否需要更新
     * ----------------------------------------
     */
    log("\n");
    log(`[${prefix}]`, "电影文件已存在，判断是否需要更新");
    if (existing_source.type === MediaTypes.Season && !existing_source.media_source_id) {
      try {
        await store.prisma.parsed_media_source.delete({
          where: {
            id: existing_source.id,
          },
        });
        const created_parsed_media = await this.add_parsed_media(data);
        const created = await store.prisma.parsed_media_source.create({
          data: {
            id: r_id(),
            type: MediaTypes.Movie,
            name,
            original_name,
            file_id,
            file_name,
            parent_file_id,
            parent_paths,
            size,
            parsed_media_id: created_parsed_media.id,
            user_id,
            drive_id,
          },
        });
        this.emit(Events.AddMovie, created);
        return Result.Ok(created);
      } catch (err) {
        const e = err as Error;
        this.emit(Events.Print, Article.build_line([`[${prefix}]`, "删除已存在的剧集，因为", e.message]));
      }
      return Result.Err("未知错误155");
    }
    const media_source_payload: {
      id: string;
      body: Partial<ParsedMediaSourceRecord>;
    } = {
      id: existing_source.id,
      body: {},
    };
    const existing_parsed_media = await (async () => {
      if (existing_source.parsed_media_id) {
        const existing = await store.prisma.parsed_media.findFirst({
          where: {
            id: existing_source.parsed_media_id,
          },
        });
        if (existing) {
          return existing;
        }
      }
      // log(`[${prefix}]`, "视频文件没有关联的电视剧记录，新增电视剧");
      const created_parsed_media = await this.add_parsed_media(data);
      return created_parsed_media;
    })();
    const media_changed = is_media_change(existing_parsed_media, {
      name: data.name,
      original_name: data.original_name,
      season_text: null,
    });
    if (Object.keys(media_changed).length !== 0) {
      this.emit(Events.Print, Article.build_line([`[${prefix}]`, "视频文件信息改变"]));
      this.emit(Events.Print, Article.build_line([JSON.stringify(media_changed)]));
      // 不修改原有 parsed_media，可能导致原先的 parsed_media 关联的 media_source 为空，需要定期清理这种 parsed_media 记录
      const created_parsed_media = await this.add_parsed_media(data);
      this.emit(Events.AddMovie, data);
      media_source_payload.body.parsed_media_id = created_parsed_media.id;
    }
    if (is_movie_media_source_change(existing_source, data)) {
      media_source_payload.body.name = data.name;
      media_source_payload.body.original_name = data.original_name;
      media_source_payload.body.file_name = data.file_name;
      media_source_payload.body.parent_file_id = data.parent_file_id;
      media_source_payload.body.parent_paths = data.parent_paths;
      media_source_payload.body.size = data.size;
      media_source_payload.body.can_search = 1;
    }
    if (Object.keys(media_source_payload.body).length !== 0) {
      log(`[${prefix}]`, "该视频文件信息发生改变，变更后的内容为", media_source_payload.id, media_source_payload.body);
      const updated = await store.prisma.parsed_media_source.update({
        where: {
          id: media_source_payload.id,
        },
        data: {
          ...media_source_payload.body,
          updated: dayjs().toISOString(),
        },
      });
      log(`[${prefix}]`, "视频文件更新成功");
      return Result.Ok(updated);
    }
    // log(`[${prefix}]`, "视频文件没有变更");
    return Result.Ok(existing_source);
  }
  async add_parsed_media(data: SearchedMovie) {
    const { name, original_name } = data;
    const prefix = `[${name}]`;
    const existing_parsed_media = await this.store.prisma.parsed_media.findFirst({
      where: {
        type: MediaTypes.Movie,
        OR: [
          {
            name,
          },
          {
            NOT: [{ original_name: null }],
            original_name,
          },
        ],
        drive_id: this.options.drive_id,
        user_id: this.options.user_id,
      },
    });
    if (existing_parsed_media) {
      return existing_parsed_media;
    }
    this.emit(Events.Print, Article.build_line([prefix, "电影", name || original_name, "不存在，新增"]));
    const n = name || original_name;
    const created = await this.store.prisma.parsed_media.create({
      data: {
        id: r_id(),
        type: MediaTypes.Movie,
        name: n,
        original_name: (() => {
          if (!original_name) {
            return null;
          }
          return name === original_name ? null : original_name;
        })(),
        drive_id: this.options.drive_id,
        user_id: this.options.user_id,
      },
    });
    return created;
  }

  on_add_movie(handler: Handler<TheTypesOfEvents[Events.AddMovie]>) {
    return this.on(Events.AddMovie, handler);
  }
}
