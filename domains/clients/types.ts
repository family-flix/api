/**
 * @file 云盘客户端
 */
import { FileType, MediaResolutionTypes } from "@/constants";
import { DataStore } from "@/domains/store/types";
import { Result } from "@/types";

export interface DriveClient {
  /** 数据库记录 id */
  id: string;
  /** 对应平台 id */
  unique_id: string;
  /** 授权凭证 */
  token: string;
  /** 索引根目录，需要手动设置。不是云盘根文件夹 */
  root_folder: { id: string; name: string } | null;

  store: DataStore;

  /** 测试 token 是否有效 */
  ping(): Promise<Result<unknown>>;
  refresh_profile(): Promise<Result<{ total_size: number; used_size: number }>>;
  /** 获取文件夹下的子文件/文件夹 */
  fetch_files(
    file_id: string,
    options?: Partial<{
      /** 页码 */
      page: number;
      /** 每页数量 */
      page_size: number;
      /** 下一页标志 */
      marker: string;
      sort: { field: "name" | "updated_at" | "size"; order: "asc" | "desc" }[];
    }>
  ): Promise<Result<{ items: GenreDriveFile[]; next_marker: string }>>;
  /** 获取单个文件/文件夹详情 */
  fetch_file(file_id: string): Promise<Result<GenreDriveFile>>;
  /** 搜索文件 */
  search_files(params: {
    name: string;
    type?: "file" | "folder";
    marker?: string;
  }): Promise<Result<{ items: GenreDriveFile[]; next_marker: string }>>;
  /** 在指定文件夹内根据名称判断是否存在该名称的文件 */
  existing(parent_file_id: string, file_name: string): Promise<Result<GenreDriveFile | null>>;
  /** 重命名指定文件 */
  rename_file(
    file_id: string,
    next_name: string,
    options?: Partial<{ check_name_mode: "auto_rename" | "refuse" | "ignore" }>
  ): Promise<Result<GenreDriveFile>>;
  /** 删除指定文件 */
  delete_file(file_id: string): Promise<Result<void>>;
  /** 创建文件夹 */
  create_folder(params: { name: string; parent_file_id: string }): Promise<Result<GenreDriveFile>>;
  /** 获取一个文件的父文件夹路径（包含自身） */
  fetch_parent_paths(
    file_id: string,
    type?: FileType
  ): Promise<
    Result<
      {
        file_id: string;
        name: string;
        parent_file_id: string;
        type: string;
      }[]
    >
  >;
  move_files_to_folder(body: {
    files: { file_id: string }[];
    target_folder_id: string;
  }): Promise<Result<GenreDriveFile[]>>;
  /** 获取文件下载链接 */
  download(file_id: string): Promise<Result<{ url: string }>>;
  /**
   * 上传一个文件到指定文件夹
   */
  upload(
    filepath: string,
    options: { name: string; parent_file_id: string; drive_id?: string; on_progress?: (v: string) => void }
  ): Promise<
    Result<{
      file_id: string;
      file_name: string;
    }>
  >;
  /** 获取一个文件的内容 */
  fetch_content(file_id: string): Promise<Result<{ content: string }>>;
  /** 获取视频文件播放地址等信息 */
  fetch_video_preview_info(file_id: string): Promise<
    Result<{
      sources: {
        name: string;
        width: number;
        height: number;
        type: MediaResolutionTypes;
        url: string;
      }[];
      subtitles: {
        id: string;
        name: string;
        url: string;
        language: "chi" | "eng" | "jpn";
      }[];
    }>
  >;
  /**
   * --------- 分享资源相关 --------------
   */
  /**
   * 获取分享详情
   * @param url 分享链接
   */
  // fetch_share_profile(
  //   url: string,
  //   options?: Partial<{ code: string | null; force: boolean }>
  // ): Promise<Result<{ share_id: string }>>;
  // fetch_resource_files(
  //   file_id: string,
  //   options: Partial<{
  //     page_size: number;
  //     share_id: string;
  //     marker: string;
  //   }>
  // ): Promise<Result<{ items: GenreDriveFile[]; next_marker: string }>>;
  // fetch_shared_file(file_id: string, options?: { share_id?: string }): Promise<Result<GenreDriveFile>>;
  // search_shared_files(
  //   keyword: string,
  //   options: Partial<{
  //     url: string;
  //     code: string;
  //     page_size: number;
  //     share_id: string;
  //     marker: string;
  //   }>
  // ): Promise<Result<{ items: GenreDriveFile[] }>>;
  /**
   * 转存分享的文件
   * 在同步资源时使用
   */
  save_shared_files(options: {
    /** 分享链接 */
    url: string;
    code?: string;
    /** 要转存的文件/文件夹 id */
    file_id: string;
    /** 转存到网盘指定的文件夹 id */
    target_file_id?: string;
  }): Promise<
    Result<{
      share_id: string;
      share_title?: string;
      share_name?: string;
    }>
  >;
  /** 一次转存多个分享的文件 */
  // save_multiple_shared_files(options: {
  //   /** 分享链接 */
  //   url: string;
  //   /** 提取码 */
  //   code?: string;
  //   /** 需要转存的文件 */
  //   file_ids?: {
  //     file_id: string;
  //   }[];
  //   /** 转存到网盘指定的文件夹 id */
  //   target_file_id?: string;
  // }): Promise<
  //   Result<{
  //     share_id: string;
  //     share_title?: string;
  //     share_name?: string;
  //   }>
  // >;
  /** 获取多个异步任务状态 */
  // fetch_multiple_async_task(args: { async_task_ids: string[] }): Promise<Result<void>>;
  /** 分享文件 */
  // create_shared_resource(file_ids: string[]): Promise<Result<void>>;
  /**
   * ------------------- 分享相关逻辑 end -------------------
   */
  checked_in(): Promise<Result<unknown>>;
}

/**
 * 所有云盘的文件结构，统一转换成该结构
 */
export type GenreDriveFile = {
  file_id: string;
  name: string;
  parent_file_id: string;
  type: string;
  md5: string | null;
  size: number;
  content_hash: string | null;
  mime_type: string | null;
  thumbnail: string | null;
  // items?: PartialAliyunDriveFile[];
};
