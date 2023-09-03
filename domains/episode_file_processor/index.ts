/**
 * @file 将解析好的电视剧、剧集、电影等信息，保存至本地数据库
 * 主要是处理重复添加和更新
 */
import { Handler } from "mitt";

import { FileType } from "@/constants";
import { BaseDomain } from "@/domains/base";
import { SearchedEpisode } from "@/domains/walker";
import { DatabaseStore } from "@/domains/store";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { Result } from "@/types";

import { is_episode_changed, is_season_changed, is_tv_changed } from "./utils";

enum Events {
  AddTV,
  AddSeason,
  AddEpisode,
  AddMovie,
}
type TheTypesOfEvents = {
  [Events.AddTV]: SearchedEpisode["tv"];
  [Events.AddSeason]: SearchedEpisode["season"];
  [Events.AddEpisode]: SearchedEpisode["episode"] & SearchedEpisode["tv"];
  [Events.AddMovie]: void;
};
type EpisodeFileProcessorProps = {
  episode: SearchedEpisode;
  user: User;
  drive: Drive;
  task_id?: string;
  store: DatabaseStore;
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

  store: DatabaseStore;
  episode: SearchedEpisode;
  options: {
    user_id: string;
    drive_id: string;
    task_id?: string;
  };

  constructor(options: Partial<{}> & EpisodeFileProcessorProps) {
    super();

    const { episode, user, drive, task_id, store } = options;
    this.episode = episode;
    this.store = store;
    this.options = {
      user_id: user.id,
      drive_id: drive.id,
      task_id,
    };
  }

  /**
   * 处理 DriveWalker 吐出的 episode 信息
   * 创建不重复的 parsed_tv、parsed_season 和 parsed_episode
   */
  async run() {
    const data = this.episode;
    const { tv, season, episode } = data;
    const store = this.store;
    const { drive_id, user_id } = this.options;
    const prefix = `${episode.parent_paths}/${episode.file_name}`;
    // log(`[${prefix}]`, "开始处理视频文件");
    const existing_episode_res = await store.find_parsed_episode({
      file_id: episode.file_id,
    });
    if (existing_episode_res.error) {
      // log("[ERROR]find episode request failed", existing_episode_res.error.message);
      // log(`[${prefix}]`, "判断视频文件是否存在失败");
      return Result.Err(existing_episode_res.error);
    }
    const existing_episode = existing_episode_res.data;

    function log(...args: unknown[]) {
      // if (!tv.name.includes("夏日")) {
      //   return;
      // }
      // console.log(...args);
    }

    if (!existing_episode) {
      /**
       * ----------------------------------------
       * 视频文件不存在，新增电视剧、季和剧集解析记录
       * ----------------------------------------
       */
      log(`[${prefix}]`, "是新视频文件");
      const tv_adding_res = await this.add_parsed_tv(data);
      if (tv_adding_res.error) {
        // log(`[${prefix}]`, "新增电视剧信息失败", tv_adding_res.error.message);
        return Result.Err(tv_adding_res.error);
      }
      // this.emit(Events.AddTV, data.tv);
      const season_adding_res = await this.add_parsed_season({ parsed_tv_id: tv_adding_res.data.id }, data);
      if (season_adding_res.error) {
        // log(`[${prefix}]`, "新增季信息失败", season_adding_res.error.message);
        return Result.Err(season_adding_res.error);
      }
      this.emit(Events.AddSeason, data.season);
      const add_episode_res = await store.add_parsed_episode({
        name: tv.name || tv.original_name,
        season_number: season.season,
        episode_number: episode.episode,
        file_id: episode.file_id,
        file_name: episode.file_name,
        parent_file_id: episode.parent_file_id,
        parent_paths: episode.parent_paths,
        type: FileType.File,
        size: episode.size,
        parsed_tv_id: tv_adding_res.data.id,
        parsed_season_id: season_adding_res.data.id,
        user_id,
        drive_id,
      });
      if (add_episode_res.error) {
        // log(`[${prefix}]`, "视频文件保存失败", add_episode_res.error.message);
        return add_episode_res;
      }
      this.emit(Events.AddEpisode, {
        ...data.episode,
        ...data.tv,
      });
      //       log(`[${prefix}]`, "视频文件保存成功");
      return Result.Ok(null);
    }
    /**
     * ----------------------------------------
     * 视频文件已存在，判断是否需要更新
     * ----------------------------------------
     */
    log("\n");
    log(`[${prefix}]`, "视频文件已存在，判断是否需要更新");
    log("电视剧信息", tv.name || tv.original_name);
    log("季信息", season.season);
    const episode_payload: {
      id: string;
      body: Record<string, string | number>;
    } = {
      id: existing_episode.id,
      body: {},
    };
    const existing_tv_res = await (async () => {
      const res = await store.find_parsed_tv({
        id: existing_episode.parsed_tv_id,
      });
      if (res.error) {
        // log("[ERROR]find existing tv failed", existing_tv_res.error.message);
        return Result.Err(res.error);
      }
      const existing_tv = res.data;
      if (!existing_tv) {
        // log(`[${prefix}]`, "视频文件没有关联的电视剧记录，新增电视剧");
        const tv_adding_res = await this.add_parsed_tv(data);
        if (tv_adding_res.error) {
          // log(`[${prefix}]`, "新增电视剧信息失败", tv_adding_res.error.message);
          return Result.Err(tv_adding_res.error);
        }
        this.emit(Events.AddTV, data.tv);
        return Result.Ok(tv_adding_res.data);
      }
      log("已经关联的电视剧", existing_tv.name || existing_tv.original_name);
      return Result.Ok(existing_tv);
    })();
    if (existing_tv_res.error) {
      return Result.Err(existing_tv_res.error);
    }
    const existing_tv = existing_tv_res.data;
    const existing_season_res = await (async () => {
      const res = await store.find_parsed_season({
        id: existing_episode.parsed_season_id,
      });
      if (res.error) {
        // log("[ERROR]find existing tv failed", existing_tv_res.error.message);
        return Result.Err(res.error);
      }
      const existing_season = res.data;
      if (!existing_season) {
        // log(`[${prefix}]`, "视频文件没有关联的季，新增");
        // return Result.Err("视频文件没有关联的季，属于异常数据");
        const season_adding_res = await this.add_parsed_season({ parsed_tv_id: existing_tv.id }, data);
        if (season_adding_res.error) {
          // log(`[${prefix}]`, "新增季信息失败", season_adding_res.error.message);
          return Result.Err(season_adding_res.error);
        }
        this.emit(Events.AddSeason, data.season);
        return Result.Ok(season_adding_res.data);
      }
      return Result.Ok(existing_season);
    })();
    if (existing_season_res.error) {
      return Result.Err(existing_season_res.error);
    }
    const existing_season = existing_season_res.data;
    // log("existing season", existing_season.season_number);
    const tv_changed = is_tv_changed(existing_tv, data);
    if (Object.keys(tv_changed).length !== 0) {
      log(`[${prefix}]`, "视频文件所属电视剧信息改变，之前为", existing_tv.name, "，改变为", tv.name, data.tv.name);
      const add_tv_res = await this.add_parsed_tv(data);
      if (add_tv_res.error) {
        log(`[${prefix}]`, "新增失败", add_tv_res.error.message);
        return Result.Err(add_tv_res.error);
      }
      this.emit(Events.AddTV, data.tv);
      episode_payload.body.parsed_tv_id = add_tv_res.data.id;
    }
    const season_changed = is_season_changed(existing_season, data);
    if (existing_season.correct_season_number) {
      episode_payload.body.season_number = existing_season.correct_season_number;
    }
    // log("season 改变了吗", season_changed, existing_season, data.season);
    if (Object.keys(season_changed).length !== 0) {
      const add_season_res = await this.add_parsed_season(
        {
          parsed_tv_id: (() => {
            if (episode_payload.body.parsed_tv_id) {
              return episode_payload.body.parsed_tv_id as string;
            }
            return existing_tv.id;
          })(),
        },
        data
      );
      if (add_season_res.error) {
        return Result.Err(add_season_res.error);
      }
      this.emit(Events.AddSeason, data.season);
      episode_payload.body.season_number = season_changed.season_number || season.season;
      episode_payload.body.parsed_season_id = add_season_res.data.id;
    }
    if (is_episode_changed(existing_episode, data)) {
      episode_payload.body.file_name = episode.file_name;
      episode_payload.body.parent_file_id = episode.parent_file_id;
      episode_payload.body.parent_paths = episode.parent_paths;
      episode_payload.body.episode_number = episode.episode;
      episode_payload.body.size = episode.size;
      episode_payload.body.can_search = 1;
    }
    if (Object.keys(episode_payload.body).length !== 0) {
      log(`[${prefix}]`, "该视频文件信息发生改变，变更后的内容为", episode_payload.id, episode_payload.body);
      const update_episode_res = await store.update_parsed_episode(episode_payload.id, episode_payload.body);
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

  /**
   * 根据 tasks 创建 tv
   * @param data
   * @param extra
   * @returns
   */
  async add_parsed_tv(data: SearchedEpisode) {
    const { tv, episode } = data;
    // const { user_id, drive_id, task_id } = this.options;
    const prefix = `${episode.parent_paths}/${episode.file_name}`;
    //     log(`[${prefix}]`, "准备为该视频文件新增电视剧", tv.name || tv.original_name);
    const parsed_adding_res = await this.add_parsed_tv_safely(data);
    if (parsed_adding_res.error) {
      return parsed_adding_res;
    }
    return Result.Ok(parsed_adding_res.data);
  }

  /**
   * 根据名称找 parsed_tv 记录，找到则返回 id，没找到就创建并返回 id
   * @param tv
   * @param extra
   * @returns
   */
  async add_parsed_tv_safely(data: SearchedEpisode) {
    // const data = this.episode;
    const { tv, episode } = data;
    // log("[UTIL]get_tv_id_by_name start", tv.name || tv.original_name);
    const { user_id, drive_id } = this.options;
    const store = this.store;
    const prefix = `${episode.parent_paths}/${episode.file_name}`;
    // console.log(`[${prefix}]`, "根据名称查找电视剧", `'${tv.name}'`, `'${tv.original_name}'`);
    const existing_tv = await store.prisma.parsed_tv.findFirst({
      where: {
        OR: [
          {
            NOT: [{ name: null }, { name: "" }],
            name: {
              equals: tv.name,
            },
          },
          {
            NOT: [{ original_name: null }, { original_name: "" }],
            original_name: {
              equals: tv.original_name,
            },
          },
        ],
        user_id,
        drive_id,
      },
    });
    if (existing_tv) {
      // console.log(`[${prefix}]`, "查找到电视剧已存在且名称为", existing_tv.name || existing_tv.original_name);
      return Result.Ok(existing_tv);
    }
    // console.log(`[${prefix}]`, "电视剧", tv.name || tv.original_name, "不存在，新增");
    const parsed_tv_adding_res = await store.add_parsed_tv({
      file_id: tv.file_id ?? null,
      file_name: tv.file_name ?? null,
      name: tv.name ?? null,
      original_name: tv.original_name ?? null,
      user_id,
      drive_id,
    });
    if (parsed_tv_adding_res.error) {
      // log("[ERROR]adding tv request failed", adding_tv_res.error.message);
      return Result.Err(parsed_tv_adding_res.error);
    }
    //     log(`[${prefix}]`, "为该视频文件新增电视剧", tv.name || tv.original_name, "成功");
    return Result.Ok(parsed_tv_adding_res.data);
  }

  /**
   * 根据 tasks 创建 season
   * @param data
   * @param extra
   * @returns
   */
  async add_parsed_season(body: { parsed_tv_id: string }, data: SearchedEpisode) {
    const { season, episode } = data;
    //     log(`[${episode.file_name}]`, "准备为该视频文件新增电视剧季", season.season);
    const season_res = await this.add_parsed_season_safely(body, data);
    if (season_res.error) {
      return Result.Err(season_res.error);
    }
    return Result.Ok(season_res.data);
  }
  async add_parsed_season_safely(body: { parsed_tv_id: string }, data: SearchedEpisode) {
    const { parsed_tv_id } = body;
    // const data = this.episode;
    const { season, episode } = data;
    const { user_id, drive_id } = this.options;
    const store = this.store;
    //     log(`[${episode.file_name}]`, "查找是否已存在该季", season.season);
    const existing_season = await store.prisma.parsed_season.findFirst({
      where: {
        season_number: {
          equals: season.season,
        },
        parsed_tv_id,
        user_id,
        drive_id,
      },
    });
    if (existing_season) {
      //       log(`[${episode.file_name}]`, "季已存在", existing_season_res.data.season_number);
      return Result.Ok(existing_season);
    }
    //     log(`[${episode.file_name}]`, "季", season.season, "不存在，新增");
    const parsed_season_adding_res = await store.add_parsed_season({
      parsed_tv_id,
      season_number: season.season,
      file_id: season.file_id || null,
      file_name: season.file_name || null,
      user_id,
      drive_id,
    });
    if (parsed_season_adding_res.error) {
      // log("[ERROR]adding tv request failed", adding_tv_res.error.message);
      return Result.Err(parsed_season_adding_res.error);
    }
    // log("[UTIL]get_tv_id_by_name end", tv.name || tv.original_name);
    //     log(`[${episode.file_name}]`, "为该视频文件新增季", season.season, "成功");
    return Result.Ok(parsed_season_adding_res.data);
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
}
