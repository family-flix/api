/**
 * @file 迅雷云盘
 * WIP
 */
import Joi from "joi";
import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";
import dayjs from "dayjs";

import { BaseDomain } from "@/domains/base";
import { User } from "@/domains/user";
import { DataStore } from "@/domains/store/types";
import { GenreDriveFile } from "@/domains/clients/types";
import { DriveClient } from "@/domains/clients/types";
import { DriveTypes } from "@/domains/drive/constants";
import { query_stringify, sleep, parseJSONStr, r_id } from "@/utils";
import { MediaResolutionTypes } from "@/constants";
import { Result, resultify } from "@/types";

import { XunleiDriveFileResp, XunleiDriveProfile, XunleiDrivePayload } from "./types";

const API_HOST = "https://cloud.189.cn";
const COMMON_HEADERS = {
  authority: "cloud.189.cn",
  accept: "application/json;charset=UTF-8",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  "browser-id": "9c3f954d6197215a827f1b15ae91bc1e",
  "sign-type": "1",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
};

enum Events {
  StateChange,
}
type TheTypesOfEvents = {
  [Events.StateChange]: XunleiDriveClientState;
};
type RequestClient = {
  get: <T>(
    url: string,
    query?: Record<string, string | number | undefined | null>,
    extra?: Partial<AxiosRequestConfig>
  ) => Promise<Result<T>>;
  post: <T>(url: string, body?: Record<string, unknown>, headers?: Record<string, unknown>) => Promise<Result<T>>;
};
type XunleiDriveClientProps = {
  id: string;
  unique_id: string;
  token: string;
  store: DataStore;
};
type XunleiDriveClientState = {};
export class XunleiDriveClient extends BaseDomain<TheTypesOfEvents> implements DriveClient {
  static async Get(options: { id?: string; unique_id?: string; user?: User; store: DataStore }) {
    const { id, unique_id, user, store } = options;
    if (!id && !unique_id) {
      return Result.Err("缺少云盘 id");
    }
    const where: Partial<{ id: string; unique_id: string; user_id: string }> = id ? { id } : { unique_id };
    if (user) {
      where.user_id = user.id;
    }
    const drive = await store.prisma.drive.findFirst({
      where: {
        id,
      },
      include: {
        drive_token: true,
      },
    });
    if (!drive) {
      return Result.Err("没有匹配的云盘记录");
    }
    const r = parseJSONStr<XunleiDriveProfile>(drive.profile);
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
    const { access_token } = token_res.data;
    return Result.Ok(
      new XunleiDriveClient({
        id: drive.id,
        unique_id: drive.unique_id,
        token: access_token,
        store,
      })
    );
  }
  static async Create(body: { payload: unknown; skip_ping?: boolean; store: DataStore; user: User }) {
    const { payload, skip_ping, store, user } = body;
    const cloud189_drive_schema = Joi.object({
      account: Joi.string().required(),
      token: Joi.string().required(),
    });
    const r = await resultify(cloud189_drive_schema.validateAsync.bind(cloud189_drive_schema))(payload);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { account, token, root_folder_id } = r.data as XunleiDrivePayload;
    const existing_drive = await store.prisma.drive.findUnique({
      where: {
        user_id_unique_id: {
          unique_id: String(account),
          user_id: user.id,
        },
      },
    });
    if (existing_drive) {
      return Result.Err("该云盘已存在，请检查信息后重试", undefined, { id: existing_drive.id });
    }
    const drive_record_id = r_id();
    const client = new XunleiDriveClient({
      id: drive_record_id,
      unique_id: account,
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
        name: account,
        avatar: "",
        type: DriveTypes.XunleiDrive,
        unique_id: account,
        profile: JSON.stringify({ name: account } as XunleiDriveProfile),
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
  $store: DataStore;

  constructor(props: Partial<{ _name: string }> & XunleiDriveClientProps) {
    super(props);

    const { id, token, store } = props;

    this.id = id;
    this.token = token;
    this.$store = store;
    const client = axios.create({
      timeout: 6000,
    });
    this.request = {
      get: async (endpoint, query, extra: Partial<AxiosRequestConfig> = {}) => {
        const url = `${endpoint}${query ? "?" + query_stringify(query) : ""}`;
        const headers = {
          ...COMMON_HEADERS,
          Cookie: `COOKIE_LOGIN_USER=${this.token}`,
        };
        try {
          const resp = await client.get(url, {
            headers,
            ...extra,
          });
          const { res_code, res_message, ...rest } = resp.data;
          if (res_code !== 0) {
            return Result.Err(res_message, res_code);
          }
          return Result.Ok(rest);
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
          Cookie:
            "COOKIE_LOGIN_USER=FAD2790652C0EEA81F466B9096B82E32145AE7B4C2DD748C03DDF6FD0D3C6853C4E00D92558996C33E0B9FEB203E9F3171BE3791CA7B140F12273007",
        };
        try {
          const resp = await client.post(url, body, {
            headers,
          });
          const { res_code, res_message, ...rest } = resp.data;
          if (res_code !== 0) {
            return Result.Err(res_message, res_code);
          }
          return Result.Ok(rest);
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
      const drive_record = await this.$store.prisma.drive.findFirst({
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
    file_id: string = "-11",
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
    const { page_size = 20, page, sort = [{ field: "name", order: "desc" }] } = options;
    await sleep(800);
    const r = await this.request.get<{
      fileListAO: {
        count: number;
        fileList: XunleiDriveFileResp[];
        fileListSize: number;
        folderList: XunleiDriveFileResp[];
      };
      lastRev: number;
    }>(API_HOST + "/api/open/file/listFiles.action", {
      folderId: file_id,
      pageSize: page_size,
      pageNum: page,
      mediaType: 0,
      iconOption: 5,
      orderBy: "lastOpTime",
      descending: "true",
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const { fileListAO } = r.data;
    const result = {
      items: [
        ...fileListAO.fileList.map((file) => {
          const { id, name, size, createDate, md5, parentId } = file;
          const data: GenreDriveFile = {
            // created_at: createDate,
            type: "file",
            file_id: id,
            name,
            parent_file_id: file_id,
            url: "",
            size,
            content_hash: md5,
            md5,
            mime_type: null,
            thumbnail: null,
          };
          return data;
        }),
        ...fileListAO.folderList.map((file) => {
          const { id, name, createDate, parentId } = file;
          const data: GenreDriveFile = {
            // created_at: createDate,
            type: "folder",
            file_id: id,
            name,
            parent_file_id: file_id,
            url: "",
            size: 0,
            md5: null,
            content_hash: null,
            mime_type: null,
            thumbnail: null,
          };
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
  async fetch_file(file_id = "-11") {
    if (file_id === undefined) {
      return Result.Err("请传入文件 id");
    }
    await this.ensure_initialized();
    const r = await this.request.get<{
      createAccount: string;
      createTime: number;
      downloadUrl: string;
      fileId: string;
      fileIdDigest: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      isFolder: boolean;
      lastOpTime: number;
      mediaType: number;
      parentId: string;
      videoInfo: {
        album: string;
        artist: string;
        bitRate: number;
        duration: number;
        format: string;
        height: number;
        icon: {
          largeUrl: string;
          smallUrl: string;
        };
        make: string;
        model: string;
        takenTime: string;
        width: number;
      };
      videoUrl: string;
    }>(API_HOST + "/api/portal/getFileInfo.action", {
      fileId: file_id,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const file = r.data;
    const { fileId, fileName, fileSize, isFolder, parentId, videoInfo } = file;
    const result: GenreDriveFile = {
      type: isFolder ? "folder" : "file",
      file_id: fileId,
      name: fileName,
      parent_file_id: parentId,
      size: fileSize,
      url: "",
      mime_type: null,
      md5: null,
      content_hash: null,
      thumbnail: videoInfo ? videoInfo.icon.largeUrl : null,
    };
    return Result.Ok(result);
  }
  /**
   * 按名字模糊搜索文件/文件夹
   */
  async search_files(params: { name: string; type?: "file" | "folder"; marker?: string }) {
    const { name, type, marker } = params;
    await this.ensure_initialized();
    let query = `name match "${name}"`;
    if (type) {
      query += ` and type = "${type}"`;
    }
    const r = await this.request.post<{
      items: XunleiDriveFileResp[];
    }>(API_HOST + "/adrive/v3/file/search", {});
    if (r.error) {
      return r;
    }
    const result = r.data.items.map((file) => {
      const { id, name, parentId, size } = file;
      const data: GenreDriveFile = {
        type: "file",
        file_id: id,
        name,
        parent_file_id: parentId,
        size,
        url: "",
        content_hash: null,
        md5: null,
        mime_type: null,
        thumbnail: null,
      };
      return data;
    });
    return Result.Ok({
      items: result,
      next_marker: "",
    });
  }
  async delete_file(file_id: string) {
    return Result.Ok(null);
  }
  async rename_file(file_id: string, next_name: string) {
    return Result.Ok(null);
  }
  /** 添加文件夹 */
  async create_folder(
    params: { parent_file_id?: string; name: string },
    options: Partial<{ check_name_mode: "refuse" | "auto_rename" | "ignore" }> = {}
  ) {
    const { parent_file_id = "root", name } = params;
    if (!name) {
      return Result.Err("缺少文件夹名称");
    }
    await this.ensure_initialized();
    const r = await this.request.post<{
      createDate: string;
      fileCata: number;
      fileListSize: number;
      id: string;
      lastOpTime: string;
      name: string;
      parentId: string;
      rev: string;
    }>(API_HOST + "/api/open/file/createFolder.action", {
      folderName: name,
      parentFolderId: parent_file_id,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const { id, name: file_name, parentId } = r.data;
    const data: GenreDriveFile = {
      type: "folder",
      file_id: id,
      name: file_name,
      parent_file_id: parentId,
      size: 0,
      url: "",
      md5: null,
      content_hash: null,
      mime_type: null,
      thumbnail: null,
    };
    return Result.Ok(data);
  }
  /** 将云盘内的文件，移动到另一个云盘 */
  async move_files_to_drive(body: {
    file_ids: string[];
    target_drive_client: XunleiDriveClient;
    target_folder_id?: string;
  }) {
    return Result.Err("请实现该方法");
  }
  async fetch_video_preview_info(file_id: string) {
    return Result.Err("请实现 fetch_video_preview_info 方法");
    // const e = await this.ensure_initialized();
    // const r = await this.request.get<{
    //   normal: {
    //     code: number;
    //     message: string;
    //     url: string;
    //     videoKbps: number;
    //   };
    // }>(API_HOST + "/api/portal/getNewVlcVideoPlayUrl.action", {
    //   fileId: file_id,
    //   type: 2,
    // });
    // if (r.error) {
    //   return Result.Err(r.error);
    // }
    // const { normal } = r.data;
    // return Result.Ok({
    //   sources: [
    //     {
    //       name: "",
    //       width: 0,
    //       height: 0,
    //       type: MediaResolutionTypes.FHD,
    //       url: normal.url,
    //     },
    //   ],
    //   subtitles: [] as {
    //     id: string;
    //     name: string;
    //     url: string;
    //     language: "chi" | "eng" | "jpn";
    //   }[],
    // });
  }
  async fetch_video_preview_info_for_download() {
    return Result.Err("请实现 fetch_video_preview_info_for_download 方法");
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
        if (String(fileId) === "-11") {
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
      items: XunleiDriveFileResp[];
      next_marker: string;
    }>(API_HOST + url, {});
    if (result.error) {
      return Result.Err(result.error);
    }
    if (result.data.items.length === 0) {
      return Result.Ok(null);
    }
    const { id, name, md5 } = result.data.items[0];
    return Result.Ok({
      file_id: id,
      name,
      parent_file_id,
      size: 0,
      content_hash: null,
      mime_type: null,
      md5,
    } as GenreDriveFile);
  }
  /** 移动指定文件到指定文件夹 */
  async move_files_to_folder(body: { files: { file_id: string }[]; target_folder_id: string }) {
    await this.ensure_initialized();
    // @todo
    const { files, target_folder_id } = body;
    const r = await this.request.post<{
      items: XunleiDriveFileResp[];
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
   * ------------------- 分享相关逻辑 end -------------------
   */
  async save_quick_shared_resource(body: { url: string }) {
    await this.ensure_initialized();
    return Result.Err("请实现该方法");
  }
  /** 签到 */
  async checked_in() {
    const r = await this.ensure_initialized();
    return Result.Err("请实现该方法");
  }
  async refresh_profile() {
    return Result.Err("请实现该方法");
  }
  async generate_thumbnail() {
    return Result.Err("请实现 generate_thumbnail 方法");
  }
  on_print() {
    return () => {};
  }
}
