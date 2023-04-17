import dayjs from "dayjs";

import { FetchParams } from "@/domains/list-helper-core";
import { PartialSearchedTV } from "@/domains/tmdb/services";
import { ListResponse, RequestedResource, Result } from "@/types";
import {
  episode_to_chinese_num,
  relative_time_from_now,
  season_to_chinese_num,
} from "@/utils";
import { request } from "@/utils/request";

/**
 * 获取电视剧列表
 */
export async function fetch_tv_list(params: FetchParams & { name: string }) {
  const { page, pageSize, ...rest } = params;
  const resp = await request.get<
    ListResponse<{
      id: string;
      name: string;
      original_name: string;
      overview: string;
      poster_path: string;
      backdrop_path: string;
      first_air_date: string;
      // updated: string;
    }>
  >("/api/tv/list", {
    ...rest,
    page,
    page_size: pageSize,
  });
  if (resp.error) {
    return resp;
  }
  return {
    ...resp.data,
    list: resp.data.list.map((history) => {
      const { ...rest } = history;
      return {
        ...rest,
        // updated: dayjs(updated).format("YYYY/MM/DD HH:mm"),
      };
    }),
  };
}
export type TVItem = RequestedResource<typeof fetch_tv_list>["list"][0];

/**
 * 获取给成员设置的推荐影片
 * @param params
 * @returns
 */
export function fetch_recommended_tvs(params: FetchParams) {
  const { page, pageSize, ...rest } = params;
  return request.get<ListResponse<PartialSearchedTV>>(
    "/api/member/recommended_tv/list",
    {
      ...rest,
      page,
      page_size: pageSize,
    }
  );
}

/**
 * 获取当前用户影片播放记录
 * @param params
 * @returns
 */
export async function fetch_play_histories(params: FetchParams) {
  const { page, pageSize, ...rest } = params;
  const r = await request.get<
    ListResponse<{
      id: string;
      /** 电视剧名称 */
      name: string;
      /** 电视剧外文名称或外文译名 */
      original_name: string;
      /** 电视剧海报地址 */
      poster_path: string;
      /** 电视剧id */
      tv_id: string;
      /** 影片id */
      episode_id: string;
      /** 该集总时长 */
      duration: string;
      /** 看到该电视剧第几集 */
      episode: string;
      /** 该集是第几季 */
      season: string;
      /** 播放记录当前集进度 */
      current_time: string;
      /** 播放记录更新时间 */
      updated: string;
      /** 当前总集数 */
      cur_episode_count: number;
      /** 该剧集当前季总集数 */
      episode_count: number;
      /** 最新一集添加时间 */
      latest_episode: string;
      /** 电视剧首播日期 */
      first_air_date: string;
      /** 该季首播日期 */
      air_date: string;
    }>
  >("/api/history/list", {
    ...rest,
    page,
    page_size: pageSize,
  });
  if (r.error) {
    return r;
  }
  return Result.Ok({
    ...r.data,
    list: r.data.list.map((history) => {
      const { updated, episode, season, latest_episode, ...rest } = history;
      return {
        ...rest,
        episode: episode_to_chinese_num(episode),
        season: season_to_chinese_num(season),
        updated: relative_time_from_now(updated),
        has_update: dayjs(latest_episode).isAfter(dayjs(updated)),
      };
    }),
  });
}
export type PlayHistoryItem = RequestedResource<
  typeof fetch_play_histories
>["list"][0];

/**
 * 获取无法识别的 tv
 */
export async function fetch_unknown_tv_list(params: FetchParams) {
  const { page, pageSize, ...rest } = params;
  const r = await request.get<
    ListResponse<{
      id: string;
      name: string;
      original_name: string;
    }>
  >(`/api/tv/incorrect`, {
    ...rest,
    page,
    page_size: pageSize,
  });
  if (r.error) {
    return r;
  }
  return Result.Ok({
    ...r.data,
    list: r.data.list.map((tv) => {
      const { id, name, original_name } = tv;
      return {
        id,
        name: name || original_name,
      };
    }),
  });
}
export type UnknownTVItem = RequestedResource<
  typeof fetch_unknown_tv_list
>["list"][0];

/**
 * 获取未识别的影视剧详情
 * @param body
 */
export function fetch_unknown_tv_profile(body: { id: string }) {
  const { id } = body;
  return request.get<{
    id: string;
    name: string;
    file_id?: string;
    file_name?: string;
    folders: {
      paths: string;
      episodes: {
        id: string;
        file_id: string;
        file_name: string;
        episode: string;
        season: string;
      }[];
    }[];
  }>(`/api/unknown_tv/${id}`);
}
export type UnknownTVProfile = RequestedResource<
  typeof fetch_unknown_tv_profile
>;

/**
 * 在 TMDB 搜索影视剧
 * @param params
 * @returns
 */
export async function search_tv_in_tmdb(
  params: FetchParams & { keyword: string }
) {
  const { keyword, page, pageSize, ...rest } = params;
  return request.get<
    ListResponse<{
      id: string;
      name: string;
      original_name: string;
      overview: string;
      poster_path: string;
      first_air_date: string;
      searched_tv_id: string;
    }>
  >(`/api/tmdb/search`, {
    ...rest,
    keyword,
    page,
    page_size: pageSize,
  });
}

export type MatchedTVOfTMDB = RequestedResource<
  typeof search_tv_in_tmdb
>["list"][0];

/**
 * 给指定 tv 绑定一个 tmdb 的搜索结果
 */
export async function bind_searched_tv_for_tv(
  id: string,
  body: MatchedTVOfTMDB
) {
  return request.post(`/api/tv/bind_searched_tv/${id}`, body);
}

/**
 * 获取成员列表
 * @param params
 * @returns
 */
export async function fetch_members(params: FetchParams) {
  const { page, pageSize, ...rest } = params;
  const resp = await request.get<
    ListResponse<{
      id: string;
      remark: string;
      disabled: number;
      links: {
        id: string;
        link: string;
        used: boolean;
      }[];
      recommended_tvs: {
        id: string;
        name: string;
        original_name: string;
        poster_path: string;
      }[];
    }>
  >("/api/member/list", {
    ...rest,
    page,
    page_size: pageSize,
  });
  if (resp.error) {
    return Result.Err(resp.error);
  }
  return Result.Ok({
    ...resp.data,
    list: resp.data.list.map((member) => {
      const { links } = member;
      return {
        ...member,
        tokenCount: links.length,
        links: links
          .map((link) => {
            const { link: pathname } = link;
            return {
              ...link,
              link: `${window.location.protocol}//${window.location.host}${pathname}`,
              token: pathname,
            };
          })
          .filter((t) => !t.used),
      };
    }),
  });
}
export type MemberItem = RequestedResource<typeof fetch_members>["list"][0];

/**
 * 添加成员
 * @param body
 * @returns
 */
export function add_member(body: { remark: string }) {
  return request.post<{ id: string }>("/api/member/add", body);
}

/**
 * 生成成员授权链接
 * @param body
 * @returns
 */
export function create_member_auth_link(body: { id: string }) {
  return request.post<{ id: string }>("/api/member_link/add", body);
}

/**
 * 给成员设置推荐影片
 * @param body
 * @returns
 */
export function add_recommended_tv(body: { member_id: string; tv_id: string }) {
  return request.post<{ id: string }>("/api/member/recommended_tv/add", body);
}

/**
 *
 * @param body
 * @returns
 */
export async function fetch_aliyun_drive_files(body: {
  drive_id: string;
  file_id: string;
  next_marker: string;
  name?: string;
  page_size?: number;
}) {
  const { drive_id, file_id, name, next_marker, page_size = 24 } = body;
  const r = await request.get<{
    items: {
      file_id: string;
      name: string;
      next_marker: string;
      parent_file_id: string;
      size: number;
      type: "folder" | "file";
      thumbnail: string;
    }[];
    next_marker: string;
  }>(`/api/drive/files/${drive_id}`, { name, file_id, next_marker, page_size });
  return r;
}

export async function fetch_shared_files(body: {
  url: string;
  file_id: string;
  next_marker: string;
}) {
  const { url, file_id, next_marker } = body;
  const r = await request.get<{
    items: {
      file_id: string;
      name: string;
      next_marker: string;
      parent_file_id: string;
      size: number;
      type: "folder" | "file";
      thumbnail: string;
    }[];
    next_marker: string;
  }>("/api/shared_files", { url, file_id, next_marker });
  return r;
}
export type AliyunFolderItem = RequestedResource<
  typeof fetch_shared_files
>["items"][0];

/**
 * 转存指定的分享文件到指定网盘
 * @param body
 * @returns
 */
export async function save_shared_files(body: {
  /** 分享链接 */
  url: string;
  /** 要转存的文件/文件夹 file_id */
  file_id: string;
  /** 要转存的文件/文件夹名称 */
  file_name: string;
  /** 转存到指定网盘 */
  drive_id: string;
  /** 转存到指定网盘的哪个文件夹，默认是根目录 */
  target_folder_id?: string;
}) {
  return request.get("/api/shared_files/save", body);
}

/**
 * 遍历指定阿里云盘下的指定文件夹
 */
export async function walk_aliyun_folder(body: {
  drive_id: string;
  file_id: string;
  name: string;
}) {
  const { drive_id, file_id, name } = body;
  return request.get(`/api/aliyun/files/${file_id}`, { name, drive_id });
}

/**
 * 转存新增的文件
 * @param body
 * @returns
 */
export async function patch_added_files(body: {
  /** 分享链接 */
  url: string;
  /** 检查是否有新增文件的文件夹 id */
  file_id: string;
  /** 检查是否有新增文件的文件夹名称 */
  file_name: string;
}) {
  return request.get("/api/shared_files/diff", body);
}

/**
 * 根据给定的文件夹名称，在网盘中找到有类似名字的文件夹
 * @param body
 * @returns
 */
export function find_folders_has_same_name(body: { name: string }) {
  return request.get<{ name: string; file_id: string }>(
    "/api/shared_files/find_folder_has_same_name",
    body
  );
}
export type FolderItem = RequestedResource<typeof find_folders_has_same_name>;

/**
 *
 * @param body
 * @returns
 */
export async function build_link_between_shared_files_with_folder(body: {
  /** 分享链接 */
  url: string;
  /** 分享文件夹 id */
  file_id: string;
  /** 分享文件夹名称 */
  file_name: string;
  /** 要建立关联的文件夹名称 */
  target_file_name?: string;
  target_file_id?: string;
}) {
  return request.post("/api/shared_files/link", body);
}

/**
 *
 * @param body
 * @returns
 */
export async function check_has_same_name_tv(body: {
  /** 检查是否有新增文件的文件夹名称 */
  file_name: string;
}) {
  return request.post<null | TVItem>("/api/shared_files/check_same_name", body);
}

/**
 * 删除网盘中的指定文件
 * @param body
 * @returns
 */
export async function delete_file_in_drive(body: { file_id: string }) {
  const { file_id } = body;
  return request.post(`/api/aliyun/delete/${file_id}`, {});
}
