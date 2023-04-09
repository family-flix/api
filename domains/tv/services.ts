import { FetchParams } from "@/domains/list-helper-core";
import { RequestedResource, Result, Unpacked, UnpackedResult } from "@/types";
import { request } from "@/utils/request";
import {
  episode_to_chinese_num,
  parse_filename_for_video,
  season_to_chinese_num,
} from "@/utils";

/**
 * 获取电视剧列表
 * @deprecated
 */
export async function fetch_tv_list(params: FetchParams) {
  console.log("[]fetch_tv_list params", params);
  const resp = await request.get<
    {
      id: string;
      /** 电视剧名称 */
      name: string;
      /** 电视剧简介 */
      overview: string;
    }[]
  >("/api/tv", params);
  if (resp.error) {
    return resp;
  }
  return resp.data;
}
/**
 * 电视剧列表中的简略电视剧信息
 */
export type PartialTVRecord = UnpackedResult<
  Unpacked<ReturnType<typeof fetch_tv_list>>
>[0];

/**
 * 获取电视剧及包含的剧集详情
 * @param params
 */
export async function fetch_tv_and_episodes_profile(params: { tv_id: string }) {
  // console.log("[]fetch_tv_profile params", params);
  const { tv_id } = params;
  const r = await request.get<{
    id: string;
    /** 电视剧名称 */
    name: string;
    /** 简介 */
    overview: string;
    /** 该 tv 有哪些季 */
    seasons: string[];
    /** 在「第一季」中包含哪些文件夹 */
    folders: {
      parent_paths: string;
      episodes: {
        id: string;
        file_id: string;
        parent_file_id: string;
        file_name: string;
        season: string;
        episode: string;
      }[];
    }[];
    /** 第一集 */
    first_episode: {
      id: string;
      file_id: string;
      parent_file_id: string;
      file_name: string;
      season: string;
      episode: string;
    } | null;
  }>(`/api/tv/${tv_id}`);
  if (r.error) {
    return r;
  }
  return Result.Ok({
    ...r.data,
    first_episode: (() => {
      if (r.data.first_episode === null) {
        return null;
      }
      const { id, file_id, parent_file_id, file_name, season, episode } =
        r.data.first_episode;
      const d = {
        id,
        file_id,
        parent_file_id,
        file_name,
        season,
        episode: episode_to_chinese_num(episode),
      };
      return d;
    })(),
    seasons: r.data.seasons,
    folders: r.data.folders.map((folder) => {
      const { parent_paths, episodes } = folder;
      const last_path = parent_paths.split("/").pop();
      // const { resolution } = parse_filename_for_video(last_path!, [
      //   "resolution",
      // ]);
      return {
        parent_paths,
        resolution: last_path || parent_paths,
        episodes: episodes.map((episode) => {
          return {
            ...episode,
            episode: episode_to_chinese_num(episode.episode),
          };
        }),
      };
    }),
  });
}
/** 电视剧详情 */
export type TVAndEpisodesProfile = UnpackedResult<
  Unpacked<ReturnType<typeof fetch_tv_and_episodes_profile>>
>;

/**
 * 获取和该 episode 属于同一季的所有影片，但是以文件夹结构返回
 * @param episode
 */
export async function fetch_folders_in_special_season(options: {
  tv_id: string;
  season: string;
}) {
  const { tv_id, season } = options;
  const r = await request.get<TVAndEpisodesProfile["folders"]>(
    `/api/tv/folders/${tv_id}`,
    {
      season,
    }
  );
  if (r.error) {
    return r;
  }
  return Result.Ok(
    r.data.map((folder) => {
      const { parent_paths, episodes } = folder;
      const last_path = parent_paths.split("/").pop();
      return {
        parent_paths,
        resolution: last_path || parent_paths,
        episodes: episodes.map((episode) => {
          return {
            ...episode,
            episode: episode_to_chinese_num(episode.episode),
          };
        }),
      };
    })
  );
}

/**
 * 获取指定 season 下第一集及其文件夹信息
 * @param options
 * @returns
 */
export function fetch_first_episode_of_season(options: {
  tv_id: string;
  season?: string;
}) {
  const { tv_id, season } = options;
  return request.get<{
    id: string;
    season: {
      id: string;
      season: string;
    };
    episode: string;
    file_id: string;
    file_name: string;
  }>("/api/episode/first", { id: tv_id, season });
}

/**
 * 获取影片详情，包括播放地址、宽高等信息
 */
export async function fetch_episode_profile(params: { id: string }) {
  // console.log("[]fetch_episode_profile", params);
  const { id } = params;
  return request.get<{
    id: string;
    /** 影片阿里云盘文件 id */
    file_id: string;
    // parent_file_id: string;
    /** 影片阿里云盘名称 */
    file_name: string;
    /** 缩略图 */
    thumbnail: string;
    /** 所在文件夹路径 */
    parent_paths: string;
    /** 第几集 */
    episode: string;
    /** 该影片属于第几季 */
    season: string;
    /** 影片分辨率 */
    type: string;
    /** 影片播放地址 */
    url: string;
    /** 影片宽度 */
    width: number;
    /** 影片高度 */
    height: number;
    /** 该影片其他分辨率 */
    other: {
      /** 影片分辨率 */
      type: string;
      /** 影片播放地址 */
      url: string;
      /** 影片宽度 */
      width: number;
      /** 影片高度 */
      height: number;
    }[];
  }>(`/api/episode/${id}`);
}
export type EpisodeProfile = UnpackedResult<
  Unpacked<ReturnType<typeof fetch_episode_profile>>
>;

/**
 * 获取指定 tv、指定 season 下的所有影片
 */
export async function fetch_episodes(params: {
  tv_id: string;
  season: string;
}) {
  const { tv_id, season } = params;
  return request.get<
    {
      id: string;
      season: {
        id: string;
        season: string;
      };
      episode: string;
      file_id: string;
      file_name: string;
    }[]
  >("/api/episode", {
    tv_id,
    season,
  });
}

/**
 * 获取影片播放地址
 */
export async function fetch_episode_play_url(params: {
  tv_id: string;
  season: string;
  episode: string;
}) {
  console.log("[]fetch_episode_play_url params", params);
  const { tv_id, season, episode } = params;
  const resp = await request.get<
    {
      type: string;
      url: string;
    }[]
  >(`/api/tv/play/${tv_id}`, { season, episode });
  if (resp.error) {
    return resp;
  }
  console.log("[]fetch_episode_play_url success", resp.data);
  return resp;
}

/**
 * 更新播放记录
 */
export async function update_play_history(params: {
  tv_id: string;
  episode_id: string;
  /** 视频当前时间 */
  current_time: number;
  duration: number;
}) {
  const { tv_id, episode_id, current_time, duration } = params;
  return request.post<null>("/api/history/update", {
    tv_id,
    episode_id,
    current_time: Math.floor(current_time),
    duration,
  });
}

/**
 * 获取播放记录
 */
export async function fetch_play_history_of_tv(params: { tv_id: string }) {
  const { tv_id } = params;
  const r = await request.get<{
    id: string;
    tv_id: string;
    episode_id: string;
    season: string;
    episode: string;
    current_time: number;
    duration: number;
  }>("/api/history", { tv_id });
  if (r.error) {
    return r;
  }
  return Result.Ok({
    ...r.data,
    episode: episode_to_chinese_num(r.data.episode),
  });
}
export type TVPlayHistory = RequestedResource<typeof fetch_play_history_of_tv>;

export function update_searched_tv_of_tv(
  tv_id: string,
  body: Record<string, unknown>
) {
  return request.post(`/api/tv/update/${tv_id}`, body);
}

/**
 * 刮削指定 tv
 */
export function scrape_tv(body: { id: string }) {
  const { id } = body;
  return request.get(`/api/tv/scrape/${id}`);
}

/**
 * 隐藏指定 tv
 * @param body
 * @returns
 */
export function hidden_tv(body: { id: string }) {
  const { id } = body;
  return request.get(`/api/tv/hidden/${id}`);
}
