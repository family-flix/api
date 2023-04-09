import { PartialAliyunDriveFile } from "@/domains/aliyundrive/types";
import { PartialSearchedTVFromTMDB } from "@/domains/tmdb/services";
import { TMDBClient } from "@/domains/tmdb";
import { SearchedEpisode } from "@/domains/walker";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { DiffTypes } from "@/domains/folder_differ";
import {
  find_recommended_pathname,
  is_tv_changed,
  is_video_file,
  parse_filename_for_video,
} from "@/utils";
import { log } from "@/logger/log";
import { store_factory } from "@/store";
import {
  StoreOperation,
  record_pagination_factory,
  process_db_value,
} from "@/store/operations";
import {
  TVRecord,
  EpisodeRecord,
  RecordCommonPart,
  SharedFilesInProgressRecord,
} from "@/store/types";
import { qiniu_upload_online_file } from "@/utils/back_end";
import { Result } from "@/types";

import { patch_tv_in_progress } from "./patch_tv_in_progress";

export type EventHandlers = Partial<{
  on_tv: (tv: TVRecord & RecordCommonPart) => void;
  on_stop: () => Result<boolean>;
  on_error: (error_msg: string[]) => void;
}>;
export type ExtraUserAndDriveInfo = {
  user_id: string;
  drive_id: string;
  async_task_id?: string;
};

export function extra_searched_tv_field(tv: PartialSearchedTVFromTMDB) {
  const {
    id: tmdb_id,
    name,
    original_name,
    backdrop_path,
    original_language,
    overview,
    popularity,
    poster_path,
    first_air_date,
    vote_average,
    vote_count,
  } = tv;
  return {
    tmdb_id,
    name,
    original_name,
    backdrop_path,
    original_language,
    overview,
    popularity,
    poster_path,
    first_air_date,
    vote_average,
    vote_count,
  };
}

export async function get_first_episode(
  tv_id: string,
  season: string = "S01",
  user_id: string,
  store: ReturnType<typeof store_factory>
) {
  const seasons_resp = await store.find_seasons(
    {
      tv_id,
    },
    {
      sorts: [
        {
          key: "season",
          order: "ASC",
        },
      ],
    }
  );
  if (seasons_resp.error) {
    return seasons_resp;
  }
  const matched_season = (() => {
    const seasons = seasons_resp.data;
    if (seasons.length === 0) {
      return null;
    }
    if (seasons.length === 1) {
      return seasons[0];
    }
    const season_1 = seasons.find((s) => s.season === season);
    if (season_1) {
      return season_1;
    }
    return seasons[0];
  })();
  if (matched_season === null) {
    return Result.Err("No episodes at all");
  }
  const episodes_resp = await store.find_episodes(
    {
      tv_id,
      season: matched_season.season,
    },
    {
      sorts: [
        {
          key: "episode",
          order: "DESC",
        },
      ],
    }
  );
  if (episodes_resp.error) {
    return episodes_resp;
  }
  const first_episode = (() => {
    if (episodes_resp.data.length === 0) {
      // 如果第一季没有，应该取第二季，依次顺延
      return null;
    }
    if (episodes_resp.data.length === 1) {
      const first = episodes_resp.data[0];
      return {
        id: first.id,
        season: {
          id: matched_season.id,
          season: matched_season.season,
        },
        episode: first.episode,
        file_id: first.file_id,
        file_name: first.file_name,
      };
    }
    const matched_first_episode = episodes_resp.data.find(
      (e) => e.episode === "E01"
    );
    if (!matched_first_episode) {
      const first = episodes_resp.data[0];
      return {
        id: first.id,
        season: {
          id: matched_season.id,
          season: matched_season.season,
        },
        episode: first.episode,
        file_id: first.file_id,
        file_name: first.file_name,
      };
    }
    return {
      id: matched_first_episode.id,
      season: {
        id: matched_season.id,
        season: matched_season.season,
      },
      episode: matched_first_episode.episode,
      file_id: matched_first_episode.file_id,
      file_name: matched_first_episode.file_name,
    };
  })();
  if (first_episode === null) {
    return Result.Err("No episode");
  }
  return Result.Ok(first_episode);
}

/**
 * 遍历云盘时保存遍历到的视频文件夹/文件
 * @param folder
 * @param extra
 * @returns
 */
export async function adding_folder_when_walk(
  folder: {
    file_id: string;
    name: string;
    parent_file_id: string;
    type: "folder" | "file";
    size?: number;
  },
  extra: ExtraUserAndDriveInfo,
  store: ReturnType<typeof store_factory>
) {
  const { file_id, name, parent_file_id, type, size = 0 } = folder;
  const { drive_id, user_id } = extra;
  // log('(adding_folder_when_walk)', name, type, !is_video_file(name));
  if (type === "file" && !is_video_file(name)) {
    return Result.Err("not video file");
  }
  const existing_folder_resp = await store.find_folder({ file_id });
  if (existing_folder_resp.error) {
    return Result.Err(existing_folder_resp.error);
  }
  if (existing_folder_resp.data) {
    return Result.Ok({ id: existing_folder_resp.data.id });
  }
  const adding_resp = await store.add_folder({
    file_id,
    name,
    parent_file_id,
    type: (() => {
      if (type === "file") {
        return 1;
      }
      if (type === "folder") {
        return 2;
      }
      return 0;
    })(),
    size,
    drive_id,
    user_id,
  });

  build_link_between_shared_files_with_folder(
    { name, target_file_id: file_id },
    { user_id, store }
  );

  if (adding_resp.error) {
    return Result.Err(adding_resp.error);
  }
  return Result.Ok({ id: adding_resp.data.id });
}

/**
 * 在分享文件夹和网盘文件夹间建立联系，当分享文件夹更新时，可以同步更新的内容到网盘文件夹中
 * 这个方法有两种场景，一种是在遍历网盘文件夹时，去找连载中的文件夹进行匹配
 * 另一种是手动在页面上，选择分享文件夹，和网盘文件夹进行匹配
 * @param body
 * @param extra
 */
export async function build_link_between_shared_files_with_folder(
  body: {
    /** 网盘内的文件夹，如果存在该参数，就不用 name 去找了 */
    target_file_id?: string;
    /** 分享文件夹的名称，通过该名称去找网盘内的文件夹，也用来在 shared_files_in_progress 表中找对应记录并更新 */
    name: string;
  },
  extra: {
    user_id: string;
    store: ReturnType<typeof store_factory>;
  }
) {
  const { name, target_file_id } = body;
  const { user_id, store } = extra;
  let f = target_file_id;
  if (!target_file_id) {
    const res = await store.find_folder({ name });
    if (res.data) {
      f = res.data.file_id;
    }
  }
  if (!f) {
    return Result.Err("不存在同名文件，请先索引网盘");
  }
  const matched_shared_files_in_progress_res =
    await store.find_shared_files_in_progress({
      name,
      target_file_id: "null",
      user_id,
    });
  if (matched_shared_files_in_progress_res.error) {
    return matched_shared_files_in_progress_res;
  }
  if (!matched_shared_files_in_progress_res.data) {
    return Result.Err("No matched record of shared_files_in_progress");
  }
  // 从连载中的文件夹中找同名文件夹，建立关联关系
  const r = await store.update_shared_files_in_progress(
    matched_shared_files_in_progress_res.data.id,
    {
      target_file_id: f,
    }
  );
  if (r.error) {
    return r;
  }
  return Result.Ok(null);
}

function is_episode_changed(
  existing_episode: EpisodeRecord,
  task: SearchedEpisode
) {
  const {
    parent_file_id,
    episode: e,
    file_name,
    size,
    parent_paths,
    season,
  } = existing_episode;
  const { episode } = task;
  return !(
    season === task.season.season &&
    parent_file_id &&
    parent_file_id === episode.parent_file_id &&
    parent_paths === episode.parent_paths &&
    e === episode.episode &&
    file_name === episode.file_name &&
    size === episode.size
  );
}

/**
 * 根据 season 查找匹配的 season 记录并返回 id，如果没有则创建 season 并返回 id
 * @param season
 * @param tv_id
 * @returns
 */
async function get_season_id_by_season_and_tv_id(
  season: SearchedEpisode["season"],
  tv_id: string,
  store: ReturnType<typeof store_factory>
) {
  const existing_season_resp = await store.find_season({
    tv_id,
    season: season.season,
  });
  if (existing_season_resp.error) {
    log(
      "[ERROR]find season request failed",
      existing_season_resp.error.message
    );
    return Result.Err("[ERROR]find season request failed");
  }
  let season_resp = await (async () => {
    const existing_season = existing_season_resp.data;
    if (existing_season) {
      log("season existing, using it's id", {
        id: existing_season.id,
      });
      return Result.Ok({ id: existing_season.id });
    }
    const adding_season_resp = await store.add_season({
      tv_id,
      season: season.season,
    });
    if (adding_season_resp.error) {
      log("adding season request failed", adding_season_resp.error);
      return Result.Err("[ERROR]adding season request failed");
    }
    return Result.Ok({ id: adding_season_resp.data.id });
  })();
  if (season_resp.error) {
    log("[ERROR]adding season request failed", season_resp.error.message);
    return Result.Err("[ERROR]adding season request failed");
  }
  const season_id = season_resp.data.id;
  return Result.Ok({ id: season_id });
}

/**
 * 根据名称找 tv 记录，找到则返回 id，没找到就创建并返回 id
 * @param tv
 * @param extra
 * @returns
 */
async function get_tv_id_by_name(
  tv: SearchedEpisode["tv"],
  extra: ExtraUserAndDriveInfo,
  store: ReturnType<typeof store_factory>
) {
  log("[UTIL]get_tv_id_by_name start", tv.name || tv.original_name);
  const { user_id, drive_id } = extra;
  const sql = `SELECT * FROM tv WHERE name != '' AND name ${process_db_value(
    tv.name
  )} OR original_name != '' AND original_name ${process_db_value(
    tv.original_name
  )} AND user_id = '${user_id}' AND drive_id = '${drive_id}'`;
  const existing_tv_resp = await store.operation.get<
    TVRecord & RecordCommonPart
  >(sql);
  if (existing_tv_resp.error) {
    log("[ERROR]find tv request failed", existing_tv_resp.error.message);
    return existing_tv_resp;
  }
  let tv_resp = await (async () => {
    if (existing_tv_resp.data) {
      log("tv existing, using it's id", { id: existing_tv_resp.data.id });
      return existing_tv_resp;
    }
    const adding_tv_resp = await store.add_tv({
      user_id: extra.user_id,
      file_id: tv.file_id,
      file_name: tv.file_name,
      drive_id: extra.drive_id,
      name: tv.name,
      original_name: tv.original_name,
    });
    return adding_tv_resp;
  })();
  if (tv_resp.error) {
    log("[ERROR]adding tv request failed", tv_resp.error.message);
    return tv_resp;
  }
  const tv_id = tv_resp.data.id;
  log("[UTIL]get_tv_id_by_name end", tv.name || tv.original_name);
  return Result.Ok({ id: tv_id });
}

/**
 * 根据 tasks 创建 tv 和 season 记录
 * @param tasks
 * @param extra
 * @returns
 */
async function add_tv_and_season(
  tasks: SearchedEpisode,
  extra: ExtraUserAndDriveInfo,
  store: ReturnType<typeof store_factory>
) {
  const { tv, season } = tasks;
  const tv_id_resp = await get_tv_id_by_name(tv, extra, store);
  if (tv_id_resp.error) {
    return tv_id_resp;
  }
  const tv_id = tv_id_resp.data.id;
  const season_id_resp = await get_season_id_by_season_and_tv_id(
    season,
    tv_id,
    store
  );
  if (season_id_resp.error) {
    return season_id_resp;
  }
  const season_id = season_id_resp.data.id;
  return Result.Ok({
    tv_id,
    season_id,
  });
}

/**
 * 修改指定影片所属的 tv
 */
export async function change_episode_tv_id(
  new_tv: { id: string },
  episode: { id: string; tv_id: string },
  store: ReturnType<typeof store_factory>
) {
  const episode_updated: { id: string; body: Record<string, string> } = {
    id: episode.id,
    body: {
      tv_id: new_tv.id,
    },
  };
  if (Object.keys(episode_updated.body).length !== 0) {
    log(`[]update episode ${episode_updated.id} with`, episode_updated.body);
    const update_episode_resp = await store.update_episode(
      episode_updated.id,
      episode_updated.body
    );
    if (update_episode_resp.error) {
      return update_episode_resp;
    }
  }
  return Result.Ok(null);
}

/**
 * 处理 VideoDetector 吐出来的 task
 */
export async function adding_episode_when_walk(
  data: SearchedEpisode,
  extra: ExtraUserAndDriveInfo,
  store: ReturnType<typeof store_factory>
) {
  const { tv, season, episode } = data;
  log("[](create_episode)", data);
  const existing_episode_resp = await store.find_episode({
    file_id: episode.file_id,
  });
  if (existing_episode_resp.error) {
    log(
      "[ERROR]find episode request failed",
      existing_episode_resp.error.message
    );
    return Result.Err(existing_episode_resp.error.message);
  }
  const existing_episode = existing_episode_resp.data;
  if (!existing_episode) {
    log("[]()is new episode");
    const tv_and_season_resp = await add_tv_and_season(data, extra, store);
    if (tv_and_season_resp.error) {
      log("[ERROR]add_tv_and_season failed", tv_and_season_resp.error.message);
      return tv_and_season_resp;
    }
    const { tv_id } = tv_and_season_resp.data;
    log("[]()before invoke add_episode");
    const add_episode_resp = await store.add_episode({
      file_id: episode.file_id,
      file_name: episode.file_name,
      parent_file_id: episode.parent_file_id,
      size: episode.size,
      parent_paths: episode.parent_paths,
      season: season.season,
      episode: episode.episode,
      tv_id,
      user_id: extra.user_id,
      drive_id: extra.drive_id,
    });
    if (add_episode_resp.error) {
      log(
        "[ERROR]adding episode request failed",
        add_episode_resp.error.message
      );
      return add_episode_resp;
    }
    log("adding episode request success", { id: add_episode_resp.data.id });
    return Result.Ok(null);
  }
  // episode existing, check does it need update
  log("the episode has existing, so check does it need update");
  const existing_tv_resp = await store.find_tv({
    id: existing_episode.tv_id,
  });
  if (existing_tv_resp.error) {
    log("[ERROR]find existing tv failed", existing_tv_resp.error.message);
    return existing_tv_resp;
  }
  const existing_tv = existing_tv_resp.data;
  if (!existing_tv) {
    return Result.Err("existing episode should have tv");
  }
  const episode_updated: {
    id: string;
    body: Record<string, string | number>;
  } = {
    id: existing_episode.id,
    body: {},
  };
  if (is_tv_changed(existing_tv, tv)) {
    log(
      "tv name or original_name is changed",
      existing_tv.name || existing_tv.original_name,
      tv.name || tv.original_name
    );
    const tv_id_resp = await get_tv_id_by_name(tv, extra, store);
    if (tv_id_resp.error) {
      return tv_id_resp;
    }
    await change_episode_tv_id(
      { id: tv_id_resp.data.id },
      existing_episode,
      store
    );
    episode_updated.body.tv_id = tv_id_resp.data.id;
  }
  if (existing_episode.season !== season.season) {
    episode_updated.body.season = season.season;
  }
  if (is_episode_changed(existing_episode, data)) {
    episode_updated.body.file_name = episode.file_name;
    episode_updated.body.parent_file_id = episode.parent_file_id;
    episode_updated.body.parent_paths = episode.parent_paths;
    episode_updated.body.episode = episode.episode;
    episode_updated.body.size = episode.size;
  }
  if (Object.keys(episode_updated.body).length !== 0) {
    log("the episode need to update", episode_updated);
    const update_episode_resp = await store.update_episode(
      episode_updated.id,
      episode_updated.body
    );
    if (update_episode_resp.error) {
      log("[ERROR]update episode failed", update_episode_resp.error.message);
      return update_episode_resp;
    }
    log("update episode success", tv.name || tv.original_name);
  }
  return Result.Ok(null);
}

/**
 * 获取指定 tv、指定 season 下所有文件夹（影片）
 * @param tv_id
 * @param season
 * @param store
 * @returns
 */
export async function find_folders_in_special_season(
  tv_id: string,
  season: string,
  store: ReturnType<typeof store_factory>
) {
  const episodes_res = await store.find_episodes(
    {
      tv_id,
      season: season,
    },
    {
      sorts: [
        {
          key: "episode",
          order: "ASC",
        },
      ],
    }
  );
  if (episodes_res.error) {
    return Result.Err(episodes_res.error);
  }
  const episodes = episodes_res.data;
  if (episodes.length === 0) {
    return Result.Ok(null);
  }
  const grouped_by_parent_episodes = episodes.reduce(
    (data, cur) => {
      const {
        id,
        file_id,
        parent_file_id,
        file_name,
        parent_paths,
        season,
        episode,
      } = cur;
      data[parent_paths] = data[parent_paths] || [];
      data[parent_paths].push({
        id,
        file_id,
        file_name,
        parent_file_id,
        season,
        episode,
      });
      return data;
    },
    {} as Record<
      string,
      {
        id: string;
        file_id: string;
        file_name: string;
        parent_file_id: string;
        season: string;
        episode: string;
      }[]
    >
  );
  // 如果在这个 season 中存在多个文件夹（多个分辨率），找到有「纯享版」这种的
  const high_resolution_folder_path = find_recommended_pathname(
    Object.keys(grouped_by_parent_episodes)
  );
  return Result.Ok({
    recommended_path: high_resolution_folder_path,
    episodes: grouped_by_parent_episodes,
  });
}

/**
 * 获取指定 tv、指定 season 下所有文件夹（影片）
 * @param tv_id
 * @param season
 * @param store
 * @returns
 */
export async function find_folders_and_recommended_path_in_special_season(
  tv_id: string,
  season: string,
  store: ReturnType<typeof store_factory>
) {
  const episodes_res = await store.find_episodes(
    {
      tv_id,
      season,
    },
    {
      sorts: [
        {
          key: "episode",
          order: "ASC",
        },
      ],
    }
  );
  if (episodes_res.error) {
    return Result.Err(episodes_res.error);
  }
  const episodes = episodes_res.data;
  if (episodes.length === 0) {
    return Result.Ok(null);
  }
  const grouped_by_parent_episodes = episodes.reduce(
    (data, cur) => {
      const {
        id,
        file_id,
        parent_file_id,
        file_name,
        parent_paths,
        season,
        episode,
      } = cur;
      data[parent_paths] = data[parent_paths] || [];
      data[parent_paths].push({
        id,
        file_id,
        file_name,
        parent_file_id,
        season,
        episode,
      });
      return data;
    },
    {} as Record<
      string,
      {
        id: string;
        file_id: string;
        file_name: string;
        parent_file_id: string;
        season: string;
        episode: string;
      }[]
    >
  );
  // 如果在这个 season 中存在多个文件夹（多个分辨率），找到有「纯享版」这种的
  const high_resolution_folder_path = find_recommended_pathname(
    Object.keys(grouped_by_parent_episodes)
  );
  return Result.Ok({
    recommended_path: high_resolution_folder_path,
    episodes: grouped_by_parent_episodes,
  });
}

export async function get_tv_profile_with_first_season_by_id(
  id: string,
  extra: Pick<ExtraUserAndDriveInfo, "user_id" | "async_task_id">,
  store: ReturnType<typeof store_factory>
) {
  const { user_id } = extra;
  if (!id) {
    return Result.Err("请传入 id 参数");
  }
  const tv_res = await store.find_tv({
    id,
    user_id,
  });
  if (tv_res.error) {
    return Result.Err(tv_res.error);
  }
  const tv = tv_res.data;
  if (!tv) {
    return Result.Err("No matched record of tv");
  }
  const seasons_res = await store.find_seasons(
    {
      tv_id: id,
    },
    {
      sorts: [
        {
          key: "season",
          order: "ASC",
        },
      ],
    }
  );
  if (seasons_res.error) {
    return Result.Err(seasons_res.error);
  }
  const seasons = seasons_res.data;
  const recommended_season = (() => {
    if (seasons.length === 0) {
      return null;
    }
    if (seasons.length === 1) {
      return seasons[0];
    }
    const first_season = seasons.find((s) => s.season === "S01");
    if (first_season) {
      return first_season;
    }
    return seasons[0];
  })();
  if (recommended_season === null) {
    // 这种情况不可能，因为会给默认的 S01
    return Result.Err("该电视剧没有季信息");
  }
  // 根据指定 season 获取影片
  const searched_tv_res = await store.find_searched_tv({
    id: tv.searched_tv_id,
  });
  if (searched_tv_res.error) {
    return Result.Err(searched_tv_res.error);
  }
  const searched_tv = searched_tv_res.data;
  const { name, original_name, overview } = (() => {
    if (searched_tv) {
      return searched_tv;
    }
    return { name: tv.name, original_name: tv.original_name, overview: "" };
  })();
  const folders_res = await find_folders_and_recommended_path_in_special_season(
    tv.id,
    recommended_season.season,
    store
  );
  if (folders_res.error) {
    return Result.Err(folders_res.error);
  }
  if (folders_res.data === null) {
    const result = {
      id,
      name,
      original_name,
      overview,
      seasons: seasons.map((season) => {
        return season.season;
      }),
      folders: [],
      first_episode: null,
    };
    return Result.Ok(result);
  }
  const { recommended_path, episodes } = folders_res.data;
  const recommended_episodes = episodes[recommended_path];
  const first_episode = (() => {
    if (recommended_episodes.length === 1) {
      const first = recommended_episodes[0];
      return {
        id: first.id,
        file_id: first.file_id,
        parent_file_id: first.parent_file_id,
        file_name: first.file_name,
        season: first.season,
        episode: first.episode,
      };
    }
    const matched_episode = recommended_episodes.find((e) =>
      ["E00", "E01"].includes(e.episode)
    );
    if (!matched_episode) {
      const first = recommended_episodes[0];
      return {
        id: first.id,
        file_id: first.file_id,
        parent_file_id: first.parent_file_id,
        file_name: first.file_name,
        season: first.season,
        episode: first.episode,
      };
    }
    return {
      id: matched_episode.id,
      file_id: matched_episode.file_id,
      parent_file_id: matched_episode.parent_file_id,
      file_name: matched_episode.file_name,
      season: matched_episode.season,
      episode: matched_episode.episode,
    };
  })();

  const result = {
    id,
    name,
    original_name,
    overview,
    seasons: seasons.map((season) => {
      return season.season;
    }),
    folders: Object.keys(episodes).map((paths) => {
      return {
        parent_paths: paths,
        episodes: episodes[paths],
      };
    }),
    first_episode,
  };
  return Result.Ok(result);
}

/**
 * 根据关键字在 TMDB 搜索匹配的电视剧，并返回列表中的第一个匹配结果
 * @param name
 * @param options
 * @returns
 */
async function find_first_matched_tv_of_tmdb(
  name: string,
  options: {
    /** TMDB token */
    token: string;
  }
) {
  const { token } = options;
  const tmdb_client = new TMDBClient({
    token,
  });
  const r1 = await tmdb_client.search_tv(name);
  if (r1.error) {
    return Result.Err(
      [
        "[ERROR]tmdbClient.search_tv failed, param is",
        name,
        ", because ",
        r1.error.message,
      ].join(" ")
    );
  }
  const { list } = r1.data;
  if (list.length === 0) {
    return Result.Ok(null);
  }
  const tv_profile = extra_searched_tv_field(list[0]);
  return Result.Ok(tv_profile);
}

/**
 * 在 tmdb 根据给定的 name 搜索，并返回第一个匹配的结果
 * @param tv
 * @param option
 * @returns
 */
export async function search_tv_in_tmdb(
  tv: {
    correct_name?: string;
    name: string;
    original_name: string;
  },
  option: Partial<{
    store: ReturnType<typeof store_factory>;
    /** TMDB token */
    token: string;
    /** 是否要将 tmdb 的海报等图片上传到 CDN */
    need_upload_image: boolean;
  }> = {}
) {
  const { token, need_upload_image, store } = option;
  if (!token) {
    return Result.Err("Missing tmdb token");
  }
  if (!store) {
    return Result.Err("Missing store");
  }
  log("[](search_tv_in_tmdb)start search", tv.name || tv.original_name);
  const { correct_name, name, original_name } = tv;
  let tv_result = null;
  if (correct_name) {
    const r1 = await find_first_matched_tv_of_tmdb(correct_name, { token });
    if (r1.error) {
      return r1;
    }
    tv_result = r1.data;
  }
  if (name) {
    const r1 = await find_first_matched_tv_of_tmdb(name, { token });
    if (r1.error) {
      return r1;
    }
    tv_result = r1.data;
  }
  if (original_name && tv_result === null) {
    const processed_original_name = original_name.split(".").join(" ");
    const r2 = await find_first_matched_tv_of_tmdb(processed_original_name, {
      token,
    });
    if (r2.error) {
      return r2;
    }
    tv_result = r2.data;
  }
  if (tv_result === null) {
    return Result.Err("search result is empty");
  }
  const searched_tv = tv_result;
  const prev_searched_tv_res = await store.find_searched_tv(
    {
      name: searched_tv.name,
      original_name: searched_tv.original_name,
    },
    "OR"
  );
  if (prev_searched_tv_res.error) {
    return Result.Err(prev_searched_tv_res.error.message);
  }
  const prev_searched_tv = prev_searched_tv_res.data;
  if (prev_searched_tv) {
    return Result.Ok(prev_searched_tv);
  }
  const {
    tmdb_id,
    name: n,
    original_name: original_n,
    original_language,
    overview = "",
    first_air_date,
    poster_path,
    backdrop_path,
    vote_average,
    popularity,
    vote_count,
  } = searched_tv;
  const {
    poster_path: uploaded_poster_path,
    backdrop_path: uploaded_backdrop_path,
  } = await (async () => {
    log(
      "[](search_tv_in_tmdb)prepare upload tmdb images",
      String(need_upload_image)
    );
    if (need_upload_image) {
      return await upload_tmdb_images({
        tmdb_id,
        poster_path,
        backdrop_path,
      });
    }
    return {
      poster_path,
      backdrop_path,
    };
  })();
  const r2 = await store.add_searched_tv({
    tmdb_id,
    name: n,
    original_name: original_n,
    overview: overview.trim(),
    poster_path: uploaded_poster_path!,
    backdrop_path: uploaded_backdrop_path!,
    popularity,
    first_air_date,
    original_language,
    vote_average,
    vote_count,
  });
  if (r2.error) {
    return Result.Err("[ERROR]add_searched_tv failed, " + r2.error.message);
  }
  return r2;
}

type FolderTree = {
  file_id: string;
  name: string;
  type: "file" | "folder";
  items?: FolderTree[];
};
/**
 * @deprecated
 * @param records
 * @returns
 */
export function build_folder_tree(records: EpisodeRecord[]) {
  function log(...args: unknown[]) {}

  let tree: FolderTree[] = [];
  let temp_tree = tree;

  for (let i = 0; i < records.length; i += 1) {
    const episode = records[i];
    // @ts-ignore
    const { file_id, file_name, parent_paths } = episode;
    const segments = parent_paths.split("/").concat(file_name);
    for (let j = 0; j < segments.length; j += 1) {
      const path = segments[j];
      const is_last = j === segments.length - 1;
      log("\n");
      log("start", path, j);
      if (temp_tree.length === 0) {
        log("items is empty");
        const name = path;
        const sub_folder_or_file = {
          file_id: is_last ? file_id : name,
          name: name,
          type: is_last ? "file" : "folder",
        } as FolderTree;
        if (!is_last) {
          sub_folder_or_file.items = [];
        }
        log(
          `${is_last ? "is" : "not"} last one, so create ${
            is_last ? "file" : "sub folder"
          } then insert`,
          path,
          sub_folder_or_file
        );
        temp_tree.push(sub_folder_or_file);
        if (!is_last) {
          temp_tree = sub_folder_or_file.items!;
        }
        if (is_last) {
          log("1 need reset temp_tree");
          temp_tree = tree;
          break;
        }
        continue;
      }
      log("not empty", temp_tree);
      const matched_folder = temp_tree.find((f) => f.file_id === path);
      if (!matched_folder) {
        const name = path;
        const sub_folder_or_file = {
          file_id: is_last ? file_id : name,
          name: name,
          type: is_last ? "file" : "folder",
        } as FolderTree;
        if (!is_last) {
          sub_folder_or_file.items = [];
        }
        log(
          `${is_last ? "is" : "not"} last one, so create ${
            is_last ? "file" : "sub folder"
          } then insert`,
          path,
          temp_tree
        );
        temp_tree.push(sub_folder_or_file);
        if (!is_last) {
          temp_tree = sub_folder_or_file.items!;
        }
        if (is_last) {
          log("2 need reset temp_tree");
          temp_tree = tree;
          break;
        }
        continue;
      }
      log("there has matched folder", matched_folder);
      if (matched_folder.items) {
        temp_tree = matched_folder.items;
      }
    }
  }
  return tree;
}

/**
 * 通过遍历一个表格全部记录
 * @param method
 * @param options
 * @returns
 */
export async function walk_table_with_pagination<T>(
  method: ReturnType<typeof record_pagination_factory>,
  options: {
    body?: Record<string, unknown>;
    on_handle: (v: T) => Promise<void>;
  }
) {
  const { body = {}, on_handle } = options;
  let no_more = false;
  let page = 1;
  do {
    const resp = await method(body, { page, size: 20 });
    if (resp.error) {
      return resp;
    }
    no_more = resp.data.no_more;
    for (let i = 0; i < resp.data.list.length; i += 1) {
      const data = resp.data.list[i];
      await on_handle(data as T);
    }
    page += 1;
  } while (no_more === false);
  return Result.Ok(null);
}

/**
 * 上传 tmdb 图片到七牛云
 * @param tmdb
 * @returns
 */
export async function upload_tmdb_images(tmdb: {
  tmdb_id: number;
  poster_path?: string;
  backdrop_path?: string;
}) {
  const { tmdb_id, poster_path, backdrop_path } = tmdb;
  log("[]upload_tmdb_images", tmdb_id, poster_path, backdrop_path);
  const result = {
    poster_path,
    backdrop_path,
  };
  if (poster_path && poster_path.includes("tmdb.org")) {
    const r = await qiniu_upload_online_file(poster_path, `/poster/${tmdb_id}`);
    if (r.error) {
      log("[]upload poster failed", r.error.message);
    }
    if (r.data) {
      const { url } = r.data;
      result.poster_path = url;
    }
  }
  if (backdrop_path && backdrop_path.includes("themoviedb.org")) {
    const r = await qiniu_upload_online_file(
      backdrop_path,
      `/backdrop/${tmdb_id}`
    );
    if (r.error) {
      log("[]upload backdrop failed", r.error.message);
    }
    if (r.data) {
      const { url } = r.data;
      result.backdrop_path = url;
    }
  }
  return result;
}

/** 遍历完云盘后的整个文件树 */
export type RequestedAliyunDriveFiles = PartialAliyunDriveFile & {
  items?: RequestedAliyunDriveFiles[];
};

/** 模拟请求阿里云盘用于单测 */
export function fetch_files_factory(options: {
  tree: RequestedAliyunDriveFiles;
  size?: number;
}): AliyunDriveClient {
  console.log("[]__invoke fetchFilesFactory");
  const { size = 10, tree } = options;
  function fetch_files(id: string, { marker }: { marker?: string }) {
    // console.log("[](fake fetchFiles)", id, marker);
    const matched = find_child_recursive(tree, id);
    // console.log("[](fake fetchFiles)", id, 'matched is', matched);
    if (matched) {
      const { items = [] } = matched;
      const first_items_result = {
        items: items.slice(0 * 1, (0 + 1) * size),
        next_marker: items.length > (0 + 1) * size ? "p1" : "",
      };
      if (marker) {
        const p = marker.match(/[0-9]{1,}/);
        if (p === undefined) {
          return Promise.resolve(Result.Ok(first_items_result));
        }
        const page = Number(p);
        return Promise.resolve(
          Result.Ok({
            items: items.slice(page * size, (page + 1) * size),
            next_marker: items.length > (page + 1) * size ? `p${page + 1}` : "",
          })
        );
      }
      return Promise.resolve(Result.Ok(first_items_result));
    }
    return Promise.resolve(
      Result.Ok({
        items: [],
        next_marker: "",
      })
    );
  }
  function fetch_file(file_id: string) {
    const result = find_child_recursive(tree, file_id);
    if (result === null) {
      return Promise.resolve(Result.Err("404"));
    }
    return Promise.resolve(Result.Ok(result));
  }
  const client = {
    fetch_files,
    fetch_file,
  } as AliyunDriveClient;
  return client;
}

export function find_child_recursive(
  file: RequestedAliyunDriveFiles,
  id: string
): RequestedAliyunDriveFiles | null {
  const { file_id, items } = file;
  if (file_id === id) {
    return file;
  }
  if (!items) {
    return null;
  }
  for (let i = 0; i < items.length; i += 1) {
    const matched = find_child_recursive(items[i], id);
    if (matched) {
      return matched;
    }
  }
  return null;
}

export function extra_name_form_pending(
  pending: (PartialAliyunDriveFile & {
    marker: string;
    remaining_child_ids: PartialAliyunDriveFile[];
  })[]
) {
  return pending.map((p) => {
    return {
      name: p.name,
      marker: !!p.marker,
      remaining_child_ids: p.remaining_child_ids.map((f) => {
        return {
          name: f.name,
        };
      }),
    };
  });
}

/**
 * 搜索 tmdb 找到 tv 匹配的结果
 * @param extra
 * @param op
 * @param event_handlers
 * @returns
 */
export async function find_matched_tv_in_tmdb(
  options: ExtraUserAndDriveInfo & {
    operation: StoreOperation;
    need_upload_image?: boolean;
  },
  event_handlers: EventHandlers = {}
) {
  const { drive_id, user_id, need_upload_image, operation } = options;
  const { find_tv_with_pagination, update_tv } = store_factory(operation);
  const { on_error } = event_handlers;
  let no_more = false;
  let page = 1;
  do {
    log("start find matched tmdb tv");
    const tvs_resp = await find_tv_with_pagination(
      {
        searched_tv_id: "null",
        user_id,
        drive_id,
      },
      { page, size: 20 }
    );
    if (tvs_resp.error) {
      log([
        "[ERROR]find tvs that searched_tv_id is null failed",
        tvs_resp.error.message,
      ]);
      return tvs_resp;
    }
    log("the tv count that no searched_tv_id is", tvs_resp.data.list.length);
    no_more = tvs_resp.data.no_more;
    for (let i = 0; i < tvs_resp.data.list.length; i += 1) {
      const tv = tvs_resp.data.list[i];
      const r1 = await search_tv_in_tmdb(
        {
          name: tv.name,
          original_name: tv.original_name,
        },
        {
          token: process.env.TMDB_TOKEN,
          need_upload_image,
        }
      );
      if (r1.error) {
        log(
          "[ERROR]search_tv_in_tmdb_then_save failed, because",
          r1.error.message
        );
        continue;
      }
      const r2 = await update_tv(tv.id, {
        searched_tv_id: r1.data.id,
      });
      if (r2.error) {
        return Result.Err(
          ["[ERROR]update tv searched_tv_id failed", r2.error.message].join(" ")
        );
      }
    }
    page += 1;
  } while (no_more === false);
  return Result.Ok(null);
}

/**
 * 搜索 tmdb 找到 tv 匹配的结果
 * @param extra
 * @param op
 * @param event_handlers
 * @returns
 */
export async function find_matched_tmp_tv_in_tmdb(
  options: ExtraUserAndDriveInfo & {
    need_upload_image?: boolean;
    operation: StoreOperation;
  },
  event_handlers: EventHandlers = {}
) {
  const { user_id, drive_id, async_task_id, operation, need_upload_image } =
    options;
  const { find_tmp_tv_with_pagination, update_tmp_tv } =
    store_factory(operation);
  const { on_error } = event_handlers;
  let no_more = false;
  let page = 1;
  do {
    log("start find matched tmdb tmp tv", page);
    const tvs_resp = await find_tmp_tv_with_pagination(
      {
        searched_tv_id: "null",
        user_id,
        async_task_id,
      },
      { page, size: 20 }
    );
    if (tvs_resp.error) {
      return tvs_resp;
    }
    no_more = tvs_resp.data.no_more;
    for (let i = 0; i < tvs_resp.data.list.length; i += 1) {
      const tv = tvs_resp.data.list[i];
      const r1 = await search_tv_in_tmdb(
        {
          name: tv.name,
          original_name: tv.original_name,
        },
        {
          token: process.env.TMDB_TOKEN,
          need_upload_image,
        }
      );
      if (r1.error) {
        log(
          "[ERROR]search_tv_in_tmdb_then_save failed, because",
          r1.error.message
        );
        continue;
      }
      const r2 = await update_tmp_tv(tv.id, {
        searched_tv_id: r1.data.id,
      });
      if (r2.error) {
        return Result.Err(
          ["[ERROR]update tmp tv searched_tv_id failed", r2.error.message].join(
            " "
          )
        );
      }
    }
    page += 1;
  } while (no_more === false);
  return Result.Ok(null);
}

/**
 * 在遍历文件夹的过程中，根据给定的目标文件/文件夹，和当前遍历到的文件夹/文件进行对比，判断是否要跳过
 */
export function need_skip_the_file_when_walk(options: {
  target_file_name: string;
  target_file_type: string;
  cur_file: { type: string; name: string; parent_paths: string };
}) {
  const { target_file_name, target_file_type, cur_file } = options;
  const {
    type: cur_type,
    name,
    parent_paths: cur_file_parent_paths,
  } = cur_file;
  if (target_file_type === "folder") {
    // 如果希望只处理指定文件夹，比如 a/b
    if (cur_type === "file") {
      // 遍历到 a/b/c/d/e.mp4 时，parent_paths = a/b/c/d 符合
      // 遍历到 a/f/g.mp4 时，parent_paths = a/f 不符合
      // 遍历到 a/f.mp4 时，parent_paths = a，不符合
      if (cur_file_parent_paths.startsWith(target_file_name)) {
        return false;
      }
    }
    if (cur_type === "folder") {
      // cur_file.name = d; cur_file.parent_paths = a/b/c
      // cur_file.name = c; cur_file.parent_paths = a/b
      // cur_file.name = b; cur_file.parent_paths = a
      // cur_file.name = a; cur_file.parent_paths = null
      if (`${cur_file_parent_paths}/${name}`.startsWith(target_file_name)) {
        return false;
      }
      if (target_file_name.startsWith(`${cur_file_parent_paths}/${name}`)) {
        return false;
      }
    }
  }
  if (target_file_type === "file") {
    // 如果只希望处理指定文件，比如 a/b/c/d/e.mp4
    if (cur_type === "file") {
      // 当前遍历到文件 a/b/c/e.mp4
      if (`${cur_file_parent_paths}/${name}` === target_file_name) {
        return false;
      }
    }
    if (cur_type === "folder") {
      // cur_file.name = d; cur_file.parent_paths = a/b/c
      // cur_file.name = c; cur_file.parent_paths = a/b
      // cur_file.name = b; cur_file.parent_paths = a
      // cur_file.name = a; cur_file.parent_paths = null
      if (target_file_name.startsWith(`${cur_file_parent_paths}/${name}`)) {
        return false;
      }
      if (`${cur_file_parent_paths}/${name}`.startsWith(target_file_name)) {
        return false;
      }
    }
  }
  return true;
}

type DuplicateEpisodes = Record<
  string,
  (Pick<EpisodeRecord, "id" | "file_id" | "file_name" | "parent_paths"> & {
    has_play?: boolean;
    first?: boolean;
  })[]
>;
export async function find_duplicate_episodes(
  extra: { user_id: string; drive_id: string },
  store: ReturnType<typeof store_factory>
) {
  const { drive_id, user_id } = extra;
  const drive_res = await store.find_aliyun_drive({ id: drive_id, user_id });
  if (drive_res.error) {
    return Result.Err(drive_res.error);
  }
  if (!drive_res.data) {
    return Result.Err("No matched record of drive");
  }
  const resp = await store.operation.all<
    (EpisodeRecord & {
      history_id: string;
    })[]
  >(
    `SELECT e.*,pp.id as history_id
      FROM episode e
      LEFT JOIN play_progress pp ON pp.episode_id = e.id
      WHERE (e.file_name,e.parent_paths) IN (
	SELECT file_name,parent_paths
	FROM episode
	WHERE drive_id = '${drive_id}'
	GROUP BY file_name,parent_paths
	HAVING COUNT(*) > 1
      )
      ORDER BY e.file_name,e.parent_paths;`
  );
  if (resp.error) {
    return Result.Err(resp.error);
  }
  const episodes = resp.data;
  if (episodes.length === 0) {
    return Result.Ok({} as DuplicateEpisodes);
  }
  const r = episodes.reduce((total, cur) => {
    const { id, file_id, file_name, parent_paths, history_id } = cur;
    const k = `${file_name}/${parent_paths}`;
    total[k] = total[k] || [];
    if (total[k].length === 0) {
      total[k].push({
        id,
        has_play: !!history_id,
        first: true,
        file_name,
        file_id,
        parent_paths,
      });
      return total;
    }
    total[k].push({
      id,
      file_name,
      has_play: !!history_id,
      file_id,
      parent_paths,
    });
    return total;
  }, {} as DuplicateEpisodes);
  return Result.Ok(r);
}

export async function patch_serialized_shared_folder(
  shared_folder: SharedFilesInProgressRecord,
  store: ReturnType<typeof store_factory>
) {
  const { name, original_name, episode_count } = parse_filename_for_video(
    shared_folder.name,
    ["name", "original_name", "episode_count"]
  );
  if (!episode_count) {
    return Result.Err(`${shared_folder.name} 非连载电视剧`);
  }
  if (!name && !original_name) {
    // 这种情况不太可能出现
    return Result.Err(`${shared_folder.name} 非电视剧`);
  }
  const { url, file_id, target_file_id, user_id } = shared_folder;
  if (!target_file_id) {
    return Result.Err(`${shared_folder.name} 还没有关联网盘文件夹`);
  }
  const matched_folder_res = await store.find_folder({
    file_id: target_file_id,
    user_id,
  });
  if (matched_folder_res.error) {
    return Result.Err(
      `${shared_folder.name} 获取关联文件夹失败 ${matched_folder_res.error.message}`
    );
  }
  if (!matched_folder_res.data) {
    return Result.Err(`${shared_folder.name} 关联文件夹不存在`);
  }
  const target_folder = matched_folder_res.data;
  const { drive_id } = matched_folder_res.data;
  const r4 = await patch_tv_in_progress(
    {
      url,
      file_name: shared_folder.name,
      file_id,
      target_folder_id: target_file_id,
      target_folder_name: target_folder.name,
    },
    {
      user_id,
      drive_id,
      store,
      wait_complete: true,
    }
  );
  if (r4.error) {
    return Result.Err(
      `${shared_folder.name} 转存新增影片失败，因为 ${r4.error}`
    );
  }
  const effects = r4.data;
  const added_video_effects = effects.filter((t) => {
    const { type, payload } = t;
    if (type !== DiffTypes.Adding) {
      return false;
    }
    const { name } = payload;
    if (!is_video_file(name)) {
      return false;
    }
    return true;
  });
  if (added_video_effects.length === 0) {
    // console.log(`${shared_folder.name} 没有新增影片`);
    return Result.Ok([]);
  }
  console.log(
    `${shared_folder.name} 新增了影片`,
    added_video_effects.map(
      (e) =>
        `${e.payload.context.map((c) => c.name).join("/")}/${e.payload.name}`
    )
  );
  return Result.Ok(
    added_video_effects.map(
      (e) =>
        `${e.payload.context.map((c) => c.name).join("/")}/${e.payload.name}`
    )
  );
  // notice_push_deer({
  //   title: `${shared_folder.name} 新增影片成功`,
  //   markdown: added_video_effects.map((e) => e.payload.name).join("\n"),
  // });
}
