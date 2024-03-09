/**
 * @file 夸克云盘
 * WIP
 */
import Joi from "joi";
import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";

import { BaseDomain } from "@/domains/base";
import { User } from "@/domains/user";
import { DataStore } from "@/domains/store/types";
import { DriveClient } from "@/domains/clients/types";
import { build_drive_file } from "@/domains/clients/utils";
import { DriveTypes } from "@/domains/drive/constants";
import { query_stringify, sleep, parseJSONStr, r_id } from "@/utils";
import { MediaResolutionTypes } from "@/constants";
import { Result, resultify } from "@/types";

import { QuarkDriveFileResp, QuarkDriveProfile, QuarkDrivePayload } from "./types";

const API_HOST = "https://drive-pc.quark.cn";
const COMMON_HEADERS = {
  authority: "drive-pc.quark.cn",
  accept: "application/json, text/plain, */*",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  origin: "https://pan.quark.cn",
  referer: "https://pan.quark.cn/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
};
const DEFAULT_ROOT_FOLDER_ID = "0";

enum Events {
  StateChange,
}
type TheTypesOfEvents = {
  [Events.StateChange]: QuarkDriveClientState;
};
type RequestClient = {
  get: <T>(
    url: string,
    query?: Record<string, string | number | undefined | null>,
    extra?: Partial<AxiosRequestConfig>
  ) => Promise<Result<T>>;
  post: <T>(url: string, body?: Record<string, unknown>, headers?: Record<string, unknown>) => Promise<Result<T>>;
};
type QuarkDriveClientProps = {
  id: string;
  unique_id: string;
  token: string;
  store: DataStore;
};
type QuarkDriveClientState = {};
export class QuarkDriveClient extends BaseDomain<TheTypesOfEvents> implements DriveClient {
  static async Get(options: { id?: string; unique_id?: string; user?: User; store: DataStore }) {
    const { id, unique_id, user, store } = options;
    if (!store) {
      return Result.Err("缺少数据库实例");
    }
    if (!id && !unique_id) {
      return Result.Err("缺少云盘 id");
    }
    const where: Partial<{ id: string; unique_id: string; user_id: string }> = id ? { id } : { unique_id };
    if (user) {
      where.user_id = user.id;
    }
    const drive = await store.prisma.drive.findFirst({
      where,
      include: {
        drive_token: true,
      },
    });
    if (!drive) {
      return Result.Err("没有匹配的云盘记录");
    }
    //     const { id, profile: p, root_folder_id } = drive;
    const r = parseJSONStr<QuarkDriveProfile>(drive.profile);
    if (r.error) {
      return Result.Err(r.error);
    }
    const token_res = await (async () => {
      if (!drive.drive_token) {
        return Result.Err("没有匹配的云盘凭证记录");
      }
      const { id: token_id, data } = drive.drive_token;
      if (data === null) {
        return Result.Err("云盘凭证缺少 refresh_token");
      }
      const r2 = parseJSONStr<{
        refresh_token: string;
        access_token: string;
      }>(data);
      if (r2.error) {
        return Result.Err(r2.error);
      }
      const { refresh_token, access_token } = r2.data;
      if (refresh_token === null) {
        return Result.Err("云盘凭证缺少 refresh_token");
      }
      return Result.Ok({
        id: token_id,
        access_token,
        refresh_token,
      });
    })();
    if (token_res.error) {
      return Result.Err(token_res.error);
    }
    const { id: token_id, access_token, refresh_token } = token_res.data;
    return Result.Ok(
      new QuarkDriveClient({
        id: drive.id,
        unique_id: drive.unique_id,
        token: access_token,
        store,
      })
    );
  }
  static async Create(body: { payload: unknown; skip_ping?: boolean; store: DataStore; user: User }) {
    const { payload, skip_ping, store, user } = body;
    const schema = Joi.object({
      id: Joi.string().required(),
      token: Joi.string().required(),
    });
    const r = await resultify(schema.validateAsync.bind(schema))(payload);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { id, token, root_folder_id } = r.data as QuarkDrivePayload;
    const existing_drive = await store.prisma.drive.findUnique({
      where: {
        user_id_unique_id: {
          unique_id: String(id),
          user_id: user.id,
        },
      },
    });
    if (existing_drive) {
      return Result.Err("该云盘已存在，请检查信息后重试", undefined, { id: existing_drive.id });
    }
    const drive_record_id = r_id();
    const client = new QuarkDriveClient({
      id: drive_record_id,
      unique_id: id,
      token,
      store,
    });
    if (!skip_ping) {
      const status_res = await client.ping();
      if (status_res.error) {
        const { message } = status_res.error;
        if (message.includes("AccessToken is invalid")) {
          return Result.Err("云盘信息有误");
        }
        return Result.Err(status_res.error.message);
      }
    }
    const created_drive = await store.prisma.drive.create({
      data: {
        id: drive_record_id,
        name: id,
        avatar: "",
        type: DriveTypes.QuarkDrive,
        unique_id: id,
        profile: JSON.stringify({ name: id } as QuarkDriveProfile),
        root_folder_id: root_folder_id || null,
        // used_size: used_size || 0,
        // total_size: total_size || 0,
        drive_token: {
          create: {
            id: r_id(),
            data: JSON.stringify({
              access_token: token,
              refresh_token: "",
            }),
            expired_at: 0,
          },
        },
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    });
    return Result.Ok({
      record: created_drive,
      client,
    });
  }

  id: string;
  unique_id = "";
  token: string;
  root_folder = null;

  /** 请求客户端 */
  request: RequestClient;
  store: DataStore;

  constructor(props: Partial<{ _name: string }> & QuarkDriveClientProps) {
    super(props);

    const { id, unique_id, token, store } = props;

    this.id = id;
    this.unique_id = unique_id;
    this.token = token;
    this.store = store;
    const client = axios.create({
      timeout: 6000,
    });
    this.request = {
      get: async (endpoint, query, extra: Partial<AxiosRequestConfig> = {}) => {
        const url = `${endpoint}${query ? "?" + query_stringify(query) : ""}`;
        const headers = {
          ...COMMON_HEADERS,
          Cookie: `__pus=${this.token}`,
        };
        try {
          const resp = await client.get(url, {
            headers,
            ...extra,
          });
          return Result.Ok(resp.data);
        } catch (err) {
          const error = err as AxiosError<{ code: string; message: string }>;
          const { response, message } = error;
          console.error("\n");
          console.error(url);
          console.error("GET request failed, because", response?.status, response?.data);
          if (response?.status === 401) {
            //     await this.refresh_aliyun_access_token();
          }
          return Result.Err(response?.data?.message || message);
        }
      },
      post: async (url, body, extra_headers = {}) => {
        const headers = {
          ...COMMON_HEADERS,
          ...extra_headers,
          //   authorization: this.access_token,
          Cookie: `__pus=${this.token}`,
        };
        try {
          const resp = await client.post(url, body, {
            headers,
          });
          return Result.Ok(resp.data);
        } catch (err) {
          const error = err as AxiosError<{ code: string; message: string }>;
          const { response, message } = error;
          console.error("\n");
          console.error(url);
          // console.error(body, headers);
          console.error("POST request failed, because", response?.data);
          // console.log(response, message);
          if (response?.status === 401) {
            if (response?.data?.code === "UserDeviceOffline") {
              //       await this.create_session();
              return Result.Err(response?.data?.code);
            }
            if (response?.data?.code === "AccessTokenInvalid") {
              // ...
            }
            if (response?.data?.code === "DeviceSessionSignatureInvalid") {
              // ...
            }
            //     await this.refresh_aliyun_access_token();
          }
          return Result.Err(response?.data?.message || message, response?.data?.code);
        }
      },
    };
  }

  /** 初始化所有信息 */
  async init() {
    // console.log("[DOMAIN]aliyundrive - init");
    const token_res = await (async () => {
      const drive_record = await this.store.prisma.drive.findFirst({
        where: {
          id: this.id,
        },
        include: {
          drive_token: true,
        },
      });
      if (!drive_record) {
        return Result.Err("没有匹配的云盘记录");
      }
      if (!drive_record.drive_token) {
        return Result.Err("没有匹配的云盘凭证记录");
      }
      const { id: token_id, data, expired_at } = drive_record.drive_token;
      const r = parseJSONStr<{
        refresh_token: string;
        access_token: string;
      }>(data);
      if (r.error) {
        return Result.Err(r.error);
      }
      const { refresh_token, access_token } = r.data;
      if (refresh_token === null) {
        return Result.Err("云盘凭证缺少 refresh_token");
      }
      //       this.access_token = access_token;
      // 这里赋值是为了下面 refresh_aliyun_access_token 中使用
      //       this.refresh_token = refresh_token;
      //       if (!expired_at || dayjs(expired_at * 1000).isBefore(dayjs())) {
      //         // console.log("access token is expired, refresh it");
      //         const refresh_token_res = await this.refresh_aliyun_access_token();
      //         if (refresh_token_res.error) {
      //           return Result.Err(refresh_token_res.error);
      //         }
      //         const create_session_res = await this.create_session();
      //         if (create_session_res.error) {
      //           return Result.Err(create_session_res.error);
      //         }
      //         return Result.Ok(refresh_token_res.data);
      //       }
      return Result.Ok({
        access_token,
        refresh_token,
      });
    })();
    // console.log("[DOMAIN]aliyundrive - init", token_res.data);
    if (token_res.error) {
      return Result.Err(token_res.error.message);
    }
    const { access_token, refresh_token } = token_res.data;
    //     this.access_token = access_token;
    //     this.refresh_token = refresh_token;
    const token = {
      access_token,
      refresh_token,
    };
    return Result.Ok(token);
  }
  async ensure_initialized() {
    const r = await this.init();
    if (r.error) {
      return Result.Err(r.error);
    }
    return Result.Ok(null);
  }
  async ping() {
    "/api/portal/getUserSizeInfo.action";
    return Result.Ok(null);
  }
  /** 获取文件列表 */
  async fetch_files(
    file_id: string = DEFAULT_ROOT_FOLDER_ID,
    options: Partial<{
      page: number;
      /** 每页数量 */
      page_size: number;
      /** 下一页标志 */
      marker: string;
      sort: { field: "name" | "updated_at" | "size"; order: "asc" | "desc" }[];
    }> = {}
  ) {
    if (file_id === undefined) {
      return Result.Err("请传入要获取的文件夹 file_id");
    }
    await this.ensure_initialized();
    const { page_size = 20, page = 1, sort = [{ field: "name", order: "desc" }] } = options;
    await sleep(800);
    const r = await this.request.get<{
      status: number;
      code: number;
      message: string;
      timestamp: number;
      data: {
        last_view_list: unknown[];
        recent_file_list: unknown[];
        list: QuarkDriveFileResp[];
      };
      metadata: {
        _size: number;
        req_id: string;
        _page: number;
        _count: number;
        _total: number;
      };
    }>(API_HOST + "/1/clouddrive/file/sort", {
      pr: "ucpro",
      fr: "pc",
      uc_param_str: "",
      pdir_fid: file_id,
      _page: page,
      _size: page_size,
      _fetch_total: 1,
      _fetch_sub_dirs: 0,
      _sort: "file_type:asc,updated_at:desc",
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const {
      data: { list },
    } = r.data;
    const result = {
      items: [
        ...list.map((file) => {
          const { fid, file_type, file_name, size, pdir_fid, thumbnail, format_type } = file;
          const data = build_drive_file({
            type: file_type === 1 ? "file" : "folder",
            file_id: fid,
            name: file_name,
            parent_file_id: pdir_fid,
            mime_type: format_type,
            size,
            thumbnail,
          });
          return data;
        }),
      ],
      next_marker: "",
    };
    return Result.Ok(result);
  }
  /**
   * 获取单个文件或文件夹详情
   */
  async fetch_file(file_id = DEFAULT_ROOT_FOLDER_ID) {
    if (file_id === undefined) {
      return Result.Err("请传入文件 id");
    }
    await this.ensure_initialized();
    const r = await this.request.get<{
      data: QuarkDriveFileResp;
    }>(API_HOST + "/1/clouddrive/file/info", {
      pr: "ucpro",
      fr: "pc",
      uc_param_str: "",
      fid: file_id,
      _fetch_full_path: 1,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const file = r.data.data;
    const { fid, file_type, file_name, size, pdir_fid, thumbnail, format_type } = file;
    const data = build_drive_file({
      type: file_type === 1 ? "file" : "folder",
      file_id: fid,
      name: file_name,
      parent_file_id: pdir_fid,
      mime_type: format_type,
      size,
      thumbnail,
    });
    return Result.Ok(data);
  }
  /**
   * 按名字模糊搜索文件/文件夹
   */
  async search_files(params: {
    name: string;
    type?: "file" | "folder";
    page?: number;
    page_size?: number;
    marker?: string;
  }) {
    const { name, type, page = 1, page_size = 20, marker } = params;
    await this.ensure_initialized();
    const r = await this.request.post<{
      items: QuarkDriveFileResp[];
    }>(API_HOST + "/1/clouddrive/file/search", {
      pr: "ucpro",
      fr: "pc",
      uc_param_str: "",
      q: name,
      _page: page,
      _size: page_size,
      _fetch_total: "1",
      _sort: "file_type:desc,updated_at:desc",
      _is_hl: "1",
    });
    if (r.error) {
      return r;
    }
    const result = r.data.items.map((file) => {
      const { fid, file_type, file_name, pdir_fid } = file;
      const data = build_drive_file({
        type: file_type === 1 ? "file" : "folder",
        file_id: fid,
        name: file_name,
        parent_file_id: pdir_fid,
      });
      return data;
    });
    return Result.Ok({
      items: result,
      next_marker: "",
    });
  }
  async delete_file(file_id: string) {
    const search = query_stringify({
      pr: "ucpro",
      fr: "pc",
      uc_param_str: "",
    });
    const r = await this.request.post<{
      status: number;
      code: number;
      message: string;
      timestamp: number;
      data: {
        task_id: string;
        finish: boolean;
      };
      metadata: {
        tq_gap: number;
      };
    }>(API_HOST + "/1/clouddrive/file/delete?" + search, {
      action_type: 2,
      exclude_fids: [],
      filelist: [file_id],
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    if (r.data.code !== 0) {
      return Result.Err(r.data.message);
    }
    const { task_id, finish } = r.data.data;
    if (finish) {
      return Result.Ok(null);
    }
    const r2 = await this.fetch_task_status({ task_id });
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    if (r2.data.status === 2) {
      return Result.Ok(null);
    }
    return Result.Err("任务未完成");
  }
  async rename_file(file_id: string, next_name: string) {
    const search = query_stringify({
      pr: "ucpro",
      fr: "pc",
      uc_param_str: "",
    });
    const r = await this.request.post<{
      status: number;
      code: number;
      message: string;
      timestamp: number;
      data: {};
    }>(API_HOST + "/1/clouddrive/file/rename?" + search, {
      fid: file_id,
      file_name: next_name,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    if (r.data.code !== 0) {
      return Result.Err(r.data.message);
    }
    return Result.Ok(null);
  }
  /** 添加文件夹 */
  async create_folder(
    params: { parent_file_id?: string; name: string },
    options: Partial<{ check_name_mode: "refuse" | "auto_rename" | "ignore" }> = {}
  ) {
    const { parent_file_id = DEFAULT_ROOT_FOLDER_ID, name } = params;
    if (!name) {
      return Result.Err("缺少文件夹名称");
    }
    await this.ensure_initialized();
    const search = query_stringify({
      pr: "ucpro",
      fr: "pc",
      uc_param_str: "",
    });
    const r = await this.request.post<{
      status: number;
      code: number;
      message: string;
      timestamp: number;
      data: {
        finish: boolean;
        fid: string;
      };
      metadata: {};
    }>(API_HOST + "/1/clouddrive/file?" + search, {
      dir_init_lock: false,
      dir_path: "",
      file_name: name,
      pdir_fid: parent_file_id,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    if (r.data.code !== 0) {
      return Result.Err(r.data.message);
    }
    const { fid } = r.data.data;
    const data = build_drive_file({
      type: "folder",
      file_id: fid,
      name,
      parent_file_id,
    });
    return Result.Ok(data);
  }
  /** 将云盘内的文件，移动到另一个云盘 */
  async move_files_to_drive(body: {
    file_ids: string[];
    target_drive_client: QuarkDriveClient;
    target_folder_id?: string;
  }) {
    return Result.Err("请实现该方法");
  }
  async fetch_video_preview_info(file_id: string) {
    const e = await this.ensure_initialized();
    const r = await this.request.get<{
      normal: {
        code: number;
        message: string;
        url: string;
        videoKbps: number;
      };
    }>(API_HOST + "/api/portal/getNewVlcVideoPlayUrl.action", {
      fileId: file_id,
      type: 2,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const { normal } = r.data;
    return Result.Ok({
      sources: [
        {
          name: "",
          width: 0,
          height: 0,
          type: MediaResolutionTypes.FHD,
          url: normal.url,
        },
      ],
      subtitles: [] as {
        id: string;
        name: string;
        url: string;
        language: "chi" | "eng" | "jpn";
      }[],
    });
  }
  /** 获取一个文件夹的完整路径（包括自身） */
  async fetch_parent_paths(file_id: string) {
    await this.ensure_initialized();
    const r = await this.request.get<{
      data: {
        createTime: number;
        downloadUrl: string;
        fileId: string;
        fileIdDigest: string;
        fileName: string;
        fileSize: number;
        fileType: string;
        icon: {
          largeUrl: string;
          smallUrl: string;
        };
        isFolder: boolean;
        isStarred: boolean;
        lastOpTime: number;
        mediaType: number;
        parentId: string;
        videoUrl: string;
      }[];
      pageNum: number;
      pageSize: number;
      path: {
        fileId: string;
        fileName: string;
        isCoShare: number;
      }[];
      recordCount: number;
    }>(API_HOST + "/api/portal/listFiles.action", {
      fileId: file_id,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const paths = [];
    for (let i = 0; i < r.data.path.length; i += 1) {
      (() => {
        const { fileId, fileName } = r.data.path[i];
        if (String(fileId) === DEFAULT_ROOT_FOLDER_ID) {
          return;
        }
        paths.push({
          file_id: fileId,
          name: fileName,
          parent_file_id: r.data.path[i - 1]?.fileId,
          type: "folder",
        });
      })();
    }
    return Result.Ok(paths);
  }
  /** 根据名称判断一个文件是否已存在 */
  async existing(parent_file_id: string, file_name: string) {
    await this.ensure_initialized();
    // @todo
    const url = "/adrive/v3/file/search";
    const result = await this.request.post<{
      items: QuarkDriveFileResp[];
      next_marker: string;
    }>(API_HOST + url, {});
    if (result.error) {
      return Result.Err(result.error);
    }
    if (result.data.items.length === 0) {
      return Result.Ok(null);
    }
    const { file_type, fid, file_name: name, pdir_fid, format_type, thumbnail } = result.data.items[0];
    const data = build_drive_file({
      type: file_type === 1 ? "file" : "folder",
      file_id: fid,
      name: file_name,
      parent_file_id: pdir_fid,
      mime_type: format_type,
      thumbnail,
    });
    return Result.Ok(data);
  }
  /** 移动指定文件到指定文件夹 */
  async move_files_to_folder(body: { files: { file_id: string }[]; target_folder_id: string }) {
    await this.ensure_initialized();
    // @todo
    const { files, target_folder_id } = body;
    const r = await this.request.post<{
      items: QuarkDriveFileResp[];
    }>(API_HOST + "/v3/batch", {
      requests: files.map((file) => {
        const { file_id } = file;
        return {
          body: {
            file_id,
            to_parent_file_id: target_folder_id,
          },
          headers: {
            "Content-Type": "application/json",
          },
          id: file_id,
          method: "POST",
          url: "/file/move",
        };
      }),
      resource: "file",
    });
    if (r.error) {
      return r;
    }
    return Result.Ok([]);
  }
  async prepare_upload() {
    const e = await this.ensure_initialized();
    const r = await this.request.get<{
      expire: number;
      pkId: string;
      pubKey: string;
      ver: string;
    }>(API_HOST + "/api/security/generateRsaKey.action", {});
    if (r.error) {
      return Result.Err(r.error);
    }
    return Result.Ok({
      sources: [],
      subtitles: [],
    });
  }
  async download(file_id: string) {
    await this.ensure_initialized();
    const r = await this.request.get<{
      fileDownloadUrl: string;
    }>(API_HOST + "/api/open/file/getFileDownloadUrl.action", {
      fileId: file_id,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    return Result.Ok({ url: r.data.fileDownloadUrl });
  }
  async upload() {
    return Result.Err("请实现 upload 方法");
  }
  async fetch_content() {
    return Result.Err("请实现 upload 方法");
  }
  /**
   * ------------------- 分享相关逻辑 -------------------
   */
  /**
   * 获取分享详情
   * @param url 分享链接
   */
  async fetch_share_profile(url: string, options: Partial<{ code: string | null; force: boolean }> = {}) {
    await this.ensure_initialized();
    return Result.Err("请实现该方法");
  }
  async fetch_resource_files(
    file_id: string,
    options: Partial<{
      page_size: number;
      share_id: string;
      marker: string;
    }>
  ) {
    const { page_size = 20, share_id, marker } = options;
    return Result.Err("请实现该方法");
  }
  async fetch_shared_file(file_id: string, options: { share_id?: string } = {}) {
    return Result.Err("请实现该方法");
  }
  async search_shared_files(
    keyword: string,
    options: Partial<{
      url: string;
      code: string;
      page_size: number;
      share_id: string;
      marker: string;
    }>
  ) {
    return Result.Err("请实现该方法");
  }
  /**
   * 转存分享的文件
   * 在同步资源时使用
   */
  async save_shared_files(options: {
    /** 分享链接 */
    url: string;
    code?: string;
    /** 要转存的文件/文件夹 id */
    file_id: string;
    /** 转存到网盘指定的文件夹 id */
    target_file_id?: string;
  }) {
    await this.ensure_initialized();
    return Result.Err("请实现该方法");
  }
  /** 一次转存多个分享的文件 */
  async save_multiple_shared_files(options: {
    /** 分享链接 */
    url: string;
    /** 提取码 */
    code?: string;
    /** 需要转存的文件 */
    file_ids?: {
      file_id: string;
    }[];
    /** 转存到网盘指定的文件夹 id */
    target_file_id?: string;
  }) {
    await this.ensure_initialized();
    return Result.Err("请实现该方法");
  }
  /** 获取多个异步任务状态 */
  async fetch_multiple_async_task(args: { async_task_ids: string[] }) {
    const { async_task_ids } = args;
    return Result.Err("请实现该方法");
  }
  /** 分享文件 */
  async create_shared_resource(file_ids: string[]) {
    await this.ensure_initialized();
    return Result.Err("请实现该方法");
  }
  /**
   * 创建快传分享资源
   */
  async create_quick_shared_resource(file_ids: string[]) {
    await this.ensure_initialized();
    return Result.Err("请实现该方法");
  }
  /** 获取快传分享资源 */
  async fetch_quick_shared_resource(url: string) {
    await this.ensure_initialized();
    return Result.Err("请实现该方法");
  }
  /**
   * ------------------- 分享相关逻辑 end -------------------
   */
  /** 查询任务状态 */
  async fetch_task_status(body: { task_id: string }) {
    const { task_id } = body;
    const query = {
      pr: "ucpro",
      fr: "pc",
      uc_param_str: "",
      task_id: task_id,
      retry_index: "0",
    };
    const r = await this.request.get<{
      status: number;
      code: number;
      message: string;
      timestamp: number;
      data: {
        task_id: string;
        task_title: string;
        status: number;
        created_at: number;
      };
      metadata: {
        tq_gap: number;
      };
    }>(API_HOST + "/1/clouddrive/task", query);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    return Result.Ok(r.data.data);
  }
  /** 签到 */
  async checked_in() {
    const r = await this.ensure_initialized();
    return Result.Err("请实现该方法");
  }
  async refresh_profile() {
    return Result.Err("请实现该方法");
  }
}
