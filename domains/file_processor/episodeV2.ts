/**
 * @file 将解析好的电视剧、剧集信息，保存至数据库
 * 主要是处理重复添加和更新
 */
import dayjs from "dayjs";

import { FileType, MediaTypes } from "@/constants";
import { BaseDomain, Handler } from "@/domains/base";
import { SearchedEpisode } from "@/domains/walker";
import { DatabaseStore } from "@/domains/store";
import { ParsedMediaSourceRecord } from "@/domains/store/types";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive/v2";
import { Article, ArticleLineNode } from "@/domains/article";
import { Result } from "@/types";
import { r_id } from "@/utils";

import { is_media_change, is_season_media_source_change } from "./utils";

enum Events {
  AddTV,
  // AddSeason,
  AddEpisode,
  AddMovie,
  Print,
}
type TheTypesOfEvents = {
  [Events.AddTV]: SearchedEpisode["tv"];
  // [Events.AddSeason]: SearchedEpisode["season"];
  [Events.AddEpisode]: SearchedEpisode["episode"] & SearchedEpisode["tv"];
  [Events.AddMovie]: void;
  [Events.Print]: ArticleLineNode;
};
type EpisodeFileProcessorProps = {
  episode: SearchedEpisode;
  unique_id?: string;
  user: User;
  drive: Drive;
  task_id?: string;
  store: DatabaseStore;
  on_print?: (node: ArticleLineNode) => void;
};

export class EpisodeFileProcessor extends BaseDomain<TheTypesOfEvents> {
  static New(props: EpisodeFileProcessorProps) {
    const { episode, user, drive, store } = props;
    if (!store) {
      return Result.Err("缺少数据库实例");
    }
    if (!user) {
      return Result.Err("缺少用户 id");
    }
    if (!drive) {
      return Result.Err("缺少云盘 id");
    }
    if (!episode) {
      return Result.Err("缺少剧集信息");
    }
    return Result.Ok(new EpisodeFileProcessor(props));
  }

  episode: SearchedEpisode;
  user: User;
  drive: Drive;
  store: DatabaseStore;
  options: {
    user_id: string;
    drive_id: string;
    unique_id?: string;
  };

  constructor(options: Partial<{}> & EpisodeFileProcessorProps) {
    super();

    const { episode, user, drive, unique_id, store, on_print } = options;
    this.episode = episode;
    this.store = store;
    this.user = user;
    this.drive = drive;
    this.options = {
      user_id: user.id,
      drive_id: drive.id,
      unique_id,
    };
    if (on_print) {
      this.on_print(on_print);
    }
  }

  /**
   * 处理 Walker 吐出的 parsed 信息
   * 创建不重复的 parsed_tv、parsed_season 和 parsed_episode
   */
  async run() {
    const data = this.episode;
    const { tv, season, episode } = data;
    const store = this.store;
    const { drive_id, user_id } = this.options;
    const prefix = `${episode.parent_paths}/${episode.file_name}`;
    const existing_source = await store.prisma.parsed_media_source.findFirst({
      where: {
        file_id: episode.file_id,
        user_id,
      },
      include: {
        parsed_media: {
          include: {
            media_profile: true,
          },
        },
      },
    });
    function log(...args: unknown[]) {
      // if (!tv.name.includes("夏日")) {
      //   return;
      // }
      // console.log(...args);
    }
    if (!existing_source) {
      /**
       * ----------------------------------------
       * 视频文件不存在，新增电视剧、季和剧集解析记录
       * ----------------------------------------
       */
      // this.emit(
      //   Events.Print,
      //   Article.build_line([`[${prefix}]`, "是新视频文件", data.tv.name || data.tv.original_name])
      // );
      const parsed_media = await this.add_parsed_media(data);
      try {
        const created = await store.prisma.parsed_media_source.create({
          data: {
            id: r_id(),
            type: MediaTypes.Season,
            name: tv.name,
            original_name: tv.original_name || null,
            season_text: season.season_text,
            episode_text: episode.episode_text,
            file_id: episode.file_id,
            file_name: episode.file_name,
            parent_file_id: episode.parent_file_id,
            parent_paths: episode.parent_paths,
            size: episode.size,
            md5: episode.md5,
            cause_job_id: this.options.unique_id,
            parsed_media_id: parsed_media.id,
            user_id,
            drive_id,
          },
        });
        this.emit(Events.AddEpisode, {
          ...data.episode,
          ...data.tv,
        });
        return Result.Ok(created);
      } catch (err) {
        const e = err as Error;
        this.emit(Events.Print, Article.build_line([`[${prefix}]`, "创建失败，因为", e.message]));
      }
      // this.emit(Events.Print, Article.build_line([`[${prefix}]`, "创建剧集成功1"]));
      return Result.Err("未知错误159");
    }
    /**
     * ----------------------------------------
     * 视频文件已存在，判断是否需要更新
     * ----------------------------------------
     */
    // this.emit(Events.Print, Article.build_line([`[${prefix}]`, "文件存在，检查是否发生变更"]));
    if (existing_source.type === MediaTypes.Movie && !existing_source.media_source_id) {
      // 原先是电影，重新索引后认为是剧集
      try {
        await store.prisma.parsed_media_source.delete({
          where: {
            id: existing_source.id,
          },
        });
        if (existing_source.parsed_media) {
          await store.prisma.parsed_media.delete({
            where: {
              id: existing_source.parsed_media.id,
            },
          });
        }
        const created_parsed_media = await this.add_parsed_media(data);
        const created = await store.prisma.parsed_media_source.create({
          data: {
            id: r_id(),
            type: MediaTypes.Season,
            name: tv.name,
            original_name: tv.original_name || null,
            season_text: season.season_text,
            episode_text: episode.episode_text,
            file_id: episode.file_id,
            file_name: episode.file_name,
            parent_file_id: episode.parent_file_id,
            parent_paths: episode.parent_paths,
            size: episode.size,
            md5: episode.md5,
            cause_job_id: this.options.unique_id,
            parsed_media_id: created_parsed_media.id,
            user_id,
            drive_id,
          },
        });
        return Result.Ok(created);
        // this.emit(Events.Print, Article.build_line([`[${prefix}]`, "创建剧集成功2"]));
      } catch (err) {
        const e = err as Error;
        this.emit(Events.Print, Article.build_line([`[${prefix}]`, "删除已存在的电影文件失败，因为", e.message]));
      }
      return Result.Err("未知错误207");
    }
    /** media_source 变更内容 */
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
      name: data.tv.name,
      original_name: data.tv.original_name,
      season_text: data.season.season_text,
      year: data.episode.year,
    });
    // this.emit(Events.Print, Article.build_line([`[${prefix}]`, "开始检查"]));
    if (Object.keys(media_changed).length !== 0) {
      this.emit(Events.Print, Article.build_line([`[${prefix}]`, "视频文件所属信息改变"]));
      this.emit(Events.Print, Article.build_line([JSON.stringify(media_changed)]));
      // 不修改原有 parsed_media，可能导致原先的 parsed_media 关联的 media_source 为空，需要定期清理这种 parsed_media 记录
      const created_parsed_media = await this.add_parsed_media(data);
      this.emit(Events.AddTV, data.tv);
      media_source_payload.body.parsed_media_id = created_parsed_media.id;
    }
    const media_source_change = is_season_media_source_change(existing_source, data);
    if (Object.keys(media_source_change).length !== 0) {
      media_source_payload.body = {
        ...media_source_payload.body,
        ...media_source_change,
        can_search: 1,
      };
    }
    if (Object.keys(media_source_payload.body).length !== 0) {
      log(`[${prefix}]`, "该视频文件信息发生改变，变更后的内容为", media_source_payload.id, media_source_payload.body);
      // const update_episode_res = await store.update_parsed_episode(media_source_payload.id, media_source_payload.body);
      const updated = await store.prisma.parsed_media_source.update({
        where: {
          id: media_source_payload.id,
        },
        data: {
          ...media_source_payload.body,
          cause_job_id: this.options.unique_id,
          can_search: 1,
          updated: dayjs().toISOString(),
        },
      });
      log(`[${prefix}]`, "视频文件更新成功");
      return Result.Ok(updated);
    }
    // log(`[${prefix}]`, "视频文件没有变更");
    return Result.Ok(existing_source);
  }
  async add_parsed_media(data: SearchedEpisode) {
    const {
      tv: { name, original_name },
      season,
    } = data;
    const prefix = `[${name}]`;
    const where = {
      type: MediaTypes.Season,
      OR: [
        {
          name,
          season_text: season.season_text || null,
          air_year: data.episode.year || null,
        },
        {
          AND: [
            {
              original_name: original_name || null,
            },
            {
              original_name: {
                not: null,
              },
            },
          ],
          season_text: season.season_text || null,
          air_year: data.episode.year || null,
        },
      ],
      // drive_id: this.options.drive_id,
      user_id: this.options.user_id,
    };
    const existing_parsed_media = await this.store.prisma.parsed_media.findFirst({
      where,
    });
    if (existing_parsed_media) {
      return existing_parsed_media;
    }
    const n = name || original_name;
    const created = await this.store.prisma.parsed_media.create({
      data: {
        id: r_id(),
        type: MediaTypes.Season,
        name: n,
        original_name: (() => {
          if (!original_name) {
            return null;
          }
          return name === original_name ? null : original_name;
        })(),
        season_text: season.season_text || null,
        air_year: data.episode.year || null,
        drive_id: this.options.drive_id,
        user_id: this.options.user_id,
      },
    });
    return created;
  }

  on_add_tv(handler: Handler<TheTypesOfEvents[Events.AddTV]>) {
    return this.on(Events.AddTV, handler);
  }
  // on_add_season(handler: Handler<TheTypesOfEvents[Events.AddSeason]>) {
  //   return this.on(Events.AddSeason, handler);
  // }
  on_add_episode(handler: Handler<TheTypesOfEvents[Events.AddEpisode]>) {
    return this.on(Events.AddEpisode, handler);
  }
  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
}
