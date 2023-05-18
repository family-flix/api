import { PartialAliyunDriveFile } from "@/domains/aliyundrive/types";
import { PartialTVProfile } from "@/domains/tmdb/services";
import { TMDBClient } from "@/domains/tmdb";
import { SearchedEpisode } from "@/domains/walker";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { DiffTypes } from "@/domains/folder_differ";
import { find_recommended_pathname, is_video_file, parse_filename_for_video } from "@/utils";
import { log } from "@/logger/log";
import { pagination_factory, store_factory } from "@/store";
import {
  ParsedTVRecord,
  ParsedEpisodeRecord,
  RecordCommonPart,
  SharedFilesInProgressRecord,
  ParsedSeasonRecord,
} from "@/store/types";
import { qiniu_upload_online_file } from "@/utils/back_end";
import { Result, resultify } from "@/types";

import { patch_tv_in_progress } from "./patch_tv_in_progress";
import { DriveFileType } from "./constants";

export type EventHandlers = Partial<{
  on_tv: (tv: ParsedTVRecord & RecordCommonPart) => void;
  on_stop: () => Result<boolean>;
  on_error: (error_msg: string[]) => void;
}>;
export type ExtraUserAndDriveInfo = {
  user_id: string;
  drive_id: string;
  async_task_id?: string;
};

/**
 * 处理 VideoDetector 吐出来的解析信息
 * 会创建 parsed_tv、parsed_season 和 parsed_episode 记录
 */
export async function add_parsed_infos_when_walk(
  data: SearchedEpisode,
  extra: ExtraUserAndDriveInfo,
  store: ReturnType<typeof store_factory>
) {
  const { tv, season, episode } = data;
  log("\n\n--------\n处理视频文件", data.episode.file_name);
  const existing_episode_res = await store.find_parsed_episode({
    file_id: episode.file_id,
  });
  if (existing_episode_res.error) {
    // log("[ERROR]find episode request failed", existing_episode_res.error.message);
    log(`[${data.episode.file_name}]`, "判断视频文件是否存在失败");
    return Result.Err(existing_episode_res.error);
  }
  const existing_episode = existing_episode_res.data;
  if (!existing_episode) {
    log(`[${data.episode.file_name}]`, "是新视频文件");
    const tv_adding_res = await add_parsed_tv(data, extra, store);
    if (tv_adding_res.error) {
      log(`[${data.episode.file_name}]`, "新增电视剧信息失败", tv_adding_res.error.message);
      return Result.Err(tv_adding_res.error);
    }
    const season_adding_res = await add_parsed_season(
      data,
      {
        parsed_tv_id: tv_adding_res.data.id,
        ...extra,
      },
      store
    );
    if (season_adding_res.error) {
      log(`[${data.episode.file_name}]`, "新增季信息失败", season_adding_res.error.message);
      return Result.Err(season_adding_res.error);
    }
    const add_episode_res = await store.add_parsed_episode({
      name: tv.name || tv.original_name,
      season_number: season.season,
      episode_number: episode.episode,
      file_id: episode.file_id,
      file_name: episode.file_name,
      parent_file_id: episode.parent_file_id,
      parent_paths: episode.parent_paths,
      type: DriveFileType.File,
      size: episode.size,
      parsed_tv_id: tv_adding_res.data.id,
      parsed_season_id: season_adding_res.data.id,
      user_id: extra.user_id,
      drive_id: extra.drive_id,
    });
    if (add_episode_res.error) {
      log(`[${data.episode.file_name}]`, "视频文件保存失败", add_episode_res.error.message);
      return add_episode_res;
    }
    log(`[${data.episode.file_name}]`, "视频文件保存成功");
    return Result.Ok(null);
  }
  const episode_payload: {
    id: string;
    body: Record<string, string | number>;
  } = {
    id: existing_episode.id,
    body: {},
  };
  log(`[${data.episode.file_name}]`, "视频文件已存在，判断是否需要更新");
  const existing_tv_res = await store.find_parsed_tv({
    id: existing_episode.parsed_tv_id,
  });
  if (existing_tv_res.error) {
    // log("[ERROR]find existing tv failed", existing_tv_res.error.message);
    return Result.Err(existing_tv_res.error);
  }
  const existing_tv = existing_tv_res.data;
  if (!existing_tv) {
    log(`[${data.episode.file_name}]`, "视频文件没有关联的电视剧记录，属于异常数据");
    return Result.Err("existing episode should have tv");
  }
  if (is_tv_changed(existing_tv, data)) {
    // prettier-ignore
    log(`[${data.episode.file_name}]`, "视频文件所属电视剧信息改变，之前为", existing_tv.name, "，改变为", tv.name);
    const parsed_adding_res = await add_unique_parsed_tv(data, extra, store);
    if (parsed_adding_res.error) {
      return Result.Err(parsed_adding_res.error);
    }
    existing_episode.parsed_tv_id = parsed_adding_res.data.id;
    episode_payload.body.parsed_tv_id = parsed_adding_res.data.id;
  }
  const existing_season_res = await store.find_parsed_season({
    id: existing_episode.parsed_season_id,
  });
  if (existing_season_res.error) {
    // log("[ERROR]find existing tv failed", existing_tv_res.error.message);
    return Result.Err(existing_season_res.error);
  }
  const existing_season = existing_season_res.data;
  if (!existing_season) {
    log(`[${data.episode.file_name}]`, "视频文件没有关联的季，属于异常数据");
    return Result.Err("existing episode should have season");
  }
  if (is_season_changed(existing_season, data)) {
    episode_payload.body.season = season.season;
    const existing_season_res = await add_unique_parsed_season(
      data,
      {
        parsed_tv_id: existing_episode.parsed_tv_id,
        ...extra,
      },
      store
    );
    if (existing_season_res.error) {
      return Result.Err(existing_season_res.error);
    }
    episode_payload.body.parsed_season_id = existing_season_res.data.id;
  }
  if (is_episode_changed(existing_episode, data)) {
    episode_payload.body.file_name = episode.file_name;
    episode_payload.body.parent_file_id = episode.parent_file_id;
    episode_payload.body.parent_paths = episode.parent_paths;
    episode_payload.body.episode = episode.episode;
    episode_payload.body.size = episode.size;
  }
  if (Object.keys(episode_payload.body).length !== 0) {
    log(`[${data.episode.file_name}]`, "该视频文件信息发生改变，变更后的内容为", episode_payload.body);
    const update_episode_res = await store.update_parsed_episode(episode_payload.id, episode_payload.body);
    if (update_episode_res.error) {
      log(`[${data.episode.file_name}]`, "视频文件更新失败", update_episode_res.error.message);
      return update_episode_res;
    }
    log(`[${data.episode.file_name}]`, "视频文件更新成功");
    return Result.Ok(null);
  }
  log(`[${data.episode.file_name}]`, "视频文件没有变更");
  return Result.Ok(null);
}

/**
 * 遍历云盘时保存遍历到的视频文件夹/文件
 * @param file
 * @param extra
 * @returns
 */
export async function adding_file_when_walk(
  file: {
    file_id: string;
    name: string;
    parent_file_id: string;
    parent_paths: string;
    type: "folder" | "file";
    size?: number;
  },
  extra: ExtraUserAndDriveInfo,
  store: ReturnType<typeof store_factory>
) {
  const { file_id, name, parent_file_id, parent_paths, type, size = 0 } = file;
  const { drive_id, user_id } = extra;
  // log('(adding_folder_when_walk)', name, type, !is_video_file(name));
  if (type === "file" && !is_video_file(name)) {
    return Result.Err("not video file");
  }
  const existing_folder_resp = await store.find_file({ file_id });
  if (existing_folder_resp.error) {
    return Result.Err(existing_folder_resp.error);
  }
  if (existing_folder_resp.data) {
    return Result.Ok({ id: existing_folder_resp.data.id });
  }
  const adding_resp = await store.add_file({
    file_id,
    name,
    parent_file_id,
    parent_paths,
    type: (() => {
      if (type === "file") {
        return DriveFileType.File;
      }
      if (type === "folder") {
        return DriveFileType.Folder;
      }
      return DriveFileType.Unknown;
    })(),
    size,
    drive_id,
    user_id,
  });
  build_link_between_shared_files_with_folder({ name, target_file_id: file_id }, { user_id, store });
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
  let f: string | undefined | null = target_file_id;
  if (!target_file_id) {
    const res = await store.find_file({ name });
    if (res.data) {
      f = res.data.file_id;
    }
  }
  if (!f) {
    return Result.Err("不存在同名文件，请先索引网盘");
  }
  const matched_shared_files_in_progress_res = await store.find_shared_files_in_progress({
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
  const r = await store.update_shared_files_in_progress(matched_shared_files_in_progress_res.data.id, {
    target_file_id: f,
  });
  if (r.error) {
    return r;
  }
  return Result.Ok(null);
}

/**
 * 根据名称找 tv 记录，找到则返回 id，没找到就创建并返回 id
 * @param tv
 * @param extra
 * @returns
 */
async function add_unique_parsed_tv(
  data: SearchedEpisode,
  extra: ExtraUserAndDriveInfo,
  store: ReturnType<typeof store_factory>
) {
  const { tv, episode } = data;
  // log("[UTIL]get_tv_id_by_name start", tv.name || tv.original_name);
  const { user_id, drive_id } = extra;
  log(`[${episode.file_name}]`, "根据名称查找电视剧", tv.name || tv.original_name);
  const existing_tv_res = await resultify(store.prisma.parsed_tv.findFirst.bind(store.prisma.parsed_tv))({
    where: {
      OR: [
        {
          name: {
            not: null,
            equals: tv.name,
          },
        },
        {
          original_name: {
            not: null,
            equals: tv.original_name,
          },
        },
      ],
      user_id,
      drive_id,
    },
  });
  if (existing_tv_res.error) {
    return Result.Err(existing_tv_res.error);
  }
  if (existing_tv_res.data) {
    log(
      `[${episode.file_name}]`,
      "查找到电视剧已存在且名称为",
      existing_tv_res.data.name || existing_tv_res.data.original_name
    );
    return Result.Ok(existing_tv_res.data);
  }
  log(`[${episode.file_name}]`, "电视剧", tv.name || tv.original_name, "不存在，新增");
  const parsed_tv_adding_res = await store.add_parsed_tv({
    file_id: tv.file_id || null,
    file_name: tv.file_name || null,
    name: tv.name || null,
    original_name: tv.original_name || null,
    user_id: extra.user_id,
    drive_id: extra.drive_id,
  });
  if (parsed_tv_adding_res.error) {
    // log("[ERROR]adding tv request failed", adding_tv_res.error.message);
    return Result.Err(parsed_tv_adding_res.error);
  }
  // log("[UTIL]get_tv_id_by_name end", tv.name || tv.original_name);
  log(`[${episode.file_name}]`, "为该视频文件新增电视剧", tv.name || tv.original_name, "成功");
  return Result.Ok(parsed_tv_adding_res.data);
}

/**
 * 根据 tasks 创建 tv
 * @param data
 * @param extra
 * @returns
 */
async function add_parsed_tv(
  data: SearchedEpisode,
  extra: ExtraUserAndDriveInfo,
  store: ReturnType<typeof store_factory>
) {
  const { tv, episode } = data;
  log(`[${episode.file_name}]`, "准备为该视频文件新增电视剧", tv.name || tv.original_name);
  const parsed_adding_res = await add_unique_parsed_tv(data, extra, store);
  if (parsed_adding_res.error) {
    return parsed_adding_res;
  }
  return Result.Ok(parsed_adding_res.data);
}

/**
 * 根据名称找 tv 记录，找到则返回 id，没找到就创建并返回 id
 * @param tv
 * @param extra
 * @returns
 */
async function add_unique_parsed_season(
  data: SearchedEpisode,
  extra: ExtraUserAndDriveInfo & { parsed_tv_id: string },
  store: ReturnType<typeof store_factory>
) {
  const { season, episode } = data;
  const { user_id, drive_id } = extra;
  log(`[${episode.file_name}]`, "查找是否已存在该季", season.season);
  const existing_season_res = await resultify(store.prisma.parsed_season.findFirst.bind(store.prisma.parsed_season))({
    where: {
      season_number: {
        equals: season.season,
      },
      parsed_tv_id: extra.parsed_tv_id,
      user_id,
      drive_id,
    },
  });
  if (existing_season_res.error) {
    return Result.Err(existing_season_res.error);
  }
  if (existing_season_res.data) {
    log(`[${episode.file_name}]`, "季已存在", existing_season_res.data.season_number);
    return Result.Ok(existing_season_res.data);
  }
  log(`[${episode.file_name}]`, "季", season.season, "不存在，新增");
  const parsed_season_adding_res = await store.add_parsed_season({
    parsed_tv_id: extra.parsed_tv_id,
    season_number: season.season,
    user_id: extra.user_id,
    drive_id: extra.drive_id,
  });
  if (parsed_season_adding_res.error) {
    // log("[ERROR]adding tv request failed", adding_tv_res.error.message);
    return Result.Err(parsed_season_adding_res.error);
  }
  // log("[UTIL]get_tv_id_by_name end", tv.name || tv.original_name);
  log(`[${episode.file_name}]`, "为该视频文件新增季", season.season, "成功");
  return Result.Ok(parsed_season_adding_res.data);
}

/**
 * 根据 tasks 创建 season
 * @param data
 * @param extra
 * @returns
 */
async function add_parsed_season(
  data: SearchedEpisode,
  extra: ExtraUserAndDriveInfo & { parsed_tv_id: string },
  store: ReturnType<typeof store_factory>
) {
  const { season, episode } = data;
  log(`[${episode.file_name}]`, "准备为该视频文件新增电视剧季", season.season);
  const season_res = await add_unique_parsed_season(data, extra, store);
  if (season_res.error) {
    return Result.Err(season_res.error);
  }
  return Result.Ok(season_res.data);
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
    // log(`[]update episode ${episode_updated.id} with`, episode_updated.body);
    const update_episode_resp = await store.update_episode(episode_updated.id, episode_updated.body);
    if (update_episode_resp.error) {
      return update_episode_resp;
    }
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
      const { id, file_id, parent_file_id, file_name, parent_paths, season, episode } = cur;
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
  const high_resolution_folder_path = find_recommended_pathname(Object.keys(grouped_by_parent_episodes));
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
      maybe_tv_id: tv_id,
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
      const { id, file_id, parent_file_id, file_name, parent_paths, season, episode } = cur;
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
  const high_resolution_folder_path = find_recommended_pathname(Object.keys(grouped_by_parent_episodes));
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
  const tv_res = await store.find_parsed_tv({
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
  if (tv.profile_id === null) {
    return Result.Err("该电视剧没有匹配");
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
  const searched_tv_res = await store.find_tv_profile({
    id: tv.tv_profile_id,
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
    const matched_episode = recommended_episodes.find((e) => ["E00", "E01"].includes(e.episode));
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
export function build_folder_tree(records: ParsedEpisodeRecord[]) {
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
          `${is_last ? "is" : "not"} last one, so create ${is_last ? "file" : "sub folder"} then insert`,
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
          `${is_last ? "is" : "not"} last one, so create ${is_last ? "file" : "sub folder"} then insert`,
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
  method: ReturnType<typeof pagination_factory>,
  options: {
    body?: Record<string, unknown>;
    on_handle: (v: T) => Promise<void>;
  }
) {
  const { body = {}, on_handle } = options;
  let no_more = false;
  let page = 1;
  do {
    const resp = await method({ where: { ...body } }, { page, size: 20 });
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
export async function upload_tmdb_images(tmdb: { tmdb_id: number; poster_path?: string; backdrop_path?: string }) {
  const { tmdb_id, poster_path, backdrop_path } = tmdb;
  // log("[]upload_tmdb_images", tmdb_id, poster_path, backdrop_path);
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
    const r = await qiniu_upload_online_file(backdrop_path, `/backdrop/${tmdb_id}`);
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
export function fetch_files_factory(options: { tree: RequestedAliyunDriveFiles; size?: number }): AliyunDriveClient {
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

export function find_child_recursive(file: RequestedAliyunDriveFiles, id: string): RequestedAliyunDriveFiles | null {
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

/**
 * 在遍历文件夹的过程中，根据给定的目标文件/文件夹，和当前遍历到的文件夹/文件进行对比，判断是否要跳过
 */
export function need_skip_the_file_when_walk(options: {
  target_file_name: string;
  target_file_type: string;
  cur_file: { type: string; name: string; parent_paths: string };
}) {
  const { target_file_name, target_file_type, cur_file } = options;
  const { type: cur_type, name, parent_paths: cur_file_parent_paths } = cur_file;
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
  (Pick<ParsedEpisodeRecord, "id" | "file_id" | "file_name" | "parent_paths"> & {
    has_play?: boolean;
    first?: boolean;
  })[]
>;
export async function find_duplicate_episodes(
  extra: { user_id: string; drive_id: string },
  store: ReturnType<typeof store_factory>
) {
  const { drive_id, user_id } = extra;
  const drive_res = await store.find_drive({ id: drive_id, user_id });
  if (drive_res.error) {
    return Result.Err(drive_res.error);
  }
  if (!drive_res.data) {
    return Result.Err("No matched record of drive");
  }
  const parent_paths = (
    await store.prisma.parsed_episode.groupBy({
      by: ["file_name", "parent_paths"],
      having: {
        file_name: {
          _count: {
            gt: 1,
          },
        },
      },
      where: {
        drive_id,
      },
      _count: {
        file_name: true,
        parent_paths: true,
      },
    })
  ).map((r) => r.parent_paths);
  const resp = await resultify(store.prisma.parsed_episode.findMany.bind(store.prisma.parsed_episode))({
    select: {
      id: true,
      file_name: true,
      parent_paths: true,
      // play_histories: true,
      // PlayHistory: true,
      // PlayHistory: {
      //   select: {
      //     id: true,
      //   },
      // },
    },
    where: {
      AND: [
        { drive_id },
        {
          parent_paths: {
            in: parent_paths,
          },
        },
      ],
    },
    orderBy: {
      file_name: "asc",
      parent_paths: "asc",
    },
  });
  if (resp.error) {
    return Result.Err(resp.error);
  }
  const episodes = resp.data;
  if (episodes.length === 0) {
    return Result.Ok({} as DuplicateEpisodes);
  }
  const r = episodes.reduce((total, cur) => {
    const { id, file_id, file_name, parent_paths } = cur;
    const k = `${file_name}/${parent_paths}`;
    total[k] = total[k] || [];
    if (total[k].length === 0) {
      total[k].push({
        id,
        has_play: false,
        // has_play: PlayHistory.id !!history_id,
        // has_play: !!PlayHistory,
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
      has_play: false,
      // has_play: !!history_id,
      // has_play: !!PlayHistory,
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
  const { name, original_name, episode_count } = parse_filename_for_video(shared_folder.name, [
    "name",
    "original_name",
    "episode_count",
  ]);
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
  const matched_folder_res = await store.find_file({
    file_id: target_file_id,
    user_id,
  });
  if (matched_folder_res.error) {
    return Result.Err(`${shared_folder.name} 获取关联文件夹失败 ${matched_folder_res.error.message}`);
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
    return Result.Err(`${shared_folder.name} 转存新增影片失败，因为 ${r4.error}`);
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
    added_video_effects.map((e) => `${e.payload.context.map((c) => c.name).join("/")}/${e.payload.name}`)
  );
  return Result.Ok(
    added_video_effects.map((e) => `${e.payload.context.map((c) => c.name).join("/")}/${e.payload.name}`)
  );
  // notice_push_deer({
  //   title: `${shared_folder.name} 新增影片成功`,
  //   markdown: added_video_effects.map((e) => e.payload.name).join("\n"),
  // });
}

/**
 * 判断两个 tv 信息是否有改变（名称有改变）
 * @param existing_tv
 * @param next_tv
 * @returns
 */
export function is_tv_changed(existing_tv: ParsedTVRecord, parsed: SearchedEpisode) {
  const { tv } = parsed;
  // log("判断视频文件所属的电视剧信息是否一致", [tv.name, tv.original_name, next_tv.name, next_tv.original_name]);
  const name = tv.name || null;
  const original_name = tv.original_name || null;
  if (existing_tv === null) {
    return false;
  }
  if (existing_tv.name === null) {
    if (name !== null) {
      return true;
    }
  }
  if (existing_tv.original_name === null) {
    if (original_name !== null) {
      return true;
    }
  }
  if (existing_tv.name !== name) {
    return true;
  }
  if (existing_tv.original_name !== original_name) {
    return true;
  }
  return false;
}

function is_season_changed(existing_season: ParsedSeasonRecord, parsed: SearchedEpisode) {
  const { season } = parsed;
  if (existing_season.season_number !== season.season) {
    return true;
  }
  return false;
}

/**
 * 影片文件是否发生改变
 * @param existing_episode
 * @param parsed
 * @returns
 */
function is_episode_changed(existing_episode: ParsedEpisodeRecord, parsed: SearchedEpisode) {
  const { episode } = parsed;
  const { parent_file_id, episode_number, file_name, size, parent_paths, season_number } = existing_episode;
  return !(
    season_number === parsed.season.season &&
    parent_file_id &&
    parent_file_id === episode.parent_file_id &&
    parent_paths === episode.parent_paths &&
    episode_number === episode.episode &&
    file_name === episode.file_name
  );
}
