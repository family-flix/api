/**
 * @file 天翼云盘
 */
import { parse, stringify } from "qs";
import Joi from "joi";
import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";
// @ts-ignore
import JSEncrypt from "node-jsencrypt";
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

import { Cloud189DriveFileResp, Cloud189DriveProfile, Cloud189DrivePayload } from "./types";

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
const DEFAULT_ROOT_FOLDER_ID = "-11";
const config = {
  clientId: "538135150693412",
  model: "KB2000",
  version: "9.0.6",
  pubKey:
    "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCZLyV4gHNDUGJMZoOcYauxmNEsKrc0TlLeBEVVIIQNzG4WqjimceOj5R9ETwDeeSN3yejAKLGHgx83lyy2wBjvnbfm/nLObyWwQD/09CmpZdxoFYCH6rdDjRpwZOZ2nXSZpgkZXoOBkfNXNxnN74aXtho2dqBynTw3NFTWyQl8BQIDAQAB",
};

enum Events {
  StateChange,
}
type TheTypesOfEvents = {
  [Events.StateChange]: Cloud189DriveClientState;
};
type RequestClient = {
  get: <T>(
    url: string,
    query?: Record<string, string | number | undefined | null>,
    extra?: Partial<AxiosRequestConfig>
  ) => Promise<Result<T>>;
  post: <T>(url: string, body?: Record<string, unknown>, extra?: Partial<AxiosRequestConfig>) => Promise<Result<T>>;
};
type Cloud189DriveClientProps = {
  id: string;
  unique_id: string;
  token: string;
  store: DataStore;
};
type Cloud189DriveClientState = {};
export class Cloud189DriveClient extends BaseDomain<TheTypesOfEvents> implements DriveClient {
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
    const r = parseJSONStr<Cloud189DriveProfile>(drive.profile);
    if (r.error) {
      return Result.Err(r.error);
    }
    //     const { device_id, resource_drive_id } = r.data;
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
    const { access_token, refresh_token } = token_res.data;
    return Result.Ok(
      new Cloud189DriveClient({
        id: drive.id,
        unique_id: drive.unique_id,
        token: access_token,
        store,
      })
    );
  }
  /** 创建云盘记录 */
  static async Create(body: { payload: unknown; store: DataStore; user: User; skip_ping?: boolean }) {
    const { payload, skip_ping, store, user } = body;
    const cloud189_drive_schema = Joi.object({
      account: Joi.string().required(),
      pwd: Joi.string().required(),
    });
    const r = await resultify(cloud189_drive_schema.validateAsync.bind(cloud189_drive_schema))(payload);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { account, pwd, root_folder_id } = r.data as Cloud189DrivePayload;
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
    const client = new Cloud189DriveClient({
      id: drive_record_id,
      unique_id: "",
      token: "",
      store,
    });
    const r2 = await client.login({ pwd });
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    const access_token = r2.data;
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
        type: DriveTypes.Cloud189Drive,
        unique_id: account,
        profile: JSON.stringify({ name: account } as Cloud189DriveProfile),
        root_folder_id: root_folder_id || null,
        // used_size: used_size || 0,
        // total_size: total_size || 0,
        drive_token: {
          create: {
            id: r_id(),
            data: JSON.stringify({
              access_token,
              refresh_token: pwd,
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

  constructor(props: Partial<{ _name: string }> & Cloud189DriveClientProps) {
    super(props);

    const { id, unique_id, token, store } = props;

    this.id = id;
    this.unique_id = unique_id;
    this.token = token;
    this.store = store;
    const client = axios.create({
      timeout: 6000,
      withCredentials: true,
    });
    this.request = {
      get: async (endpoint, query = {}, extra: Partial<AxiosRequestConfig> = {}) => {
        const { headers = {}, ...restOptions } = extra;
        const url = `${endpoint}${Object.keys(query).length ? "?" + query_stringify(query) : ""}`;
        const hs = {
          ...COMMON_HEADERS,
          ...headers,
          Cookie: this.token ? `COOKIE_LOGIN_USER=${this.token}` : undefined,
        };
        try {
          const resp = await client.get(url, {
            headers: hs,
            ...restOptions,
          });
          if (resp.request.path.match(/appId=cloud&lt=/)) {
            const [, search] = resp.request.path.split("?");
            const query = parse(search, { ignoreQueryPrefix: true });
            return Result.Ok(query);
          }
          const { ...rest } = resp.data;
          return Result.Ok({
            ...rest,
          });
        } catch (err) {
          const error = err as AxiosError<{ code: string; message: string }>;
          const { response, message } = error;
          if (response && response.status === 302) {
            return Result.Ok({
              headers: response.headers,
            });
          }
          console.error("\n");
          console.error(url);
          console.error("GET request failed, because", response?.status, response?.data);
          if (response?.status === 401) {
            //     await this.refresh_aliyun_access_token();
          }
          return Result.Err(response?.data?.message || message);
        }
      },
      post: async (url, body, extra: Partial<AxiosRequestConfig> = {}) => {
        const { headers = {}, ...restOptions } = extra;
        const hs = {
          ...COMMON_HEADERS,
          ...headers,
          Cookie: this.token ? `COOKIE_LOGIN_USER=${this.token}` : undefined,
        };
        try {
          const resp = await client.post(url, body, {
            headers: hs,
            ...restOptions,
          });
          const { ...rest } = resp.data;
          return Result.Ok(rest);
        } catch (err) {
          const error = err as AxiosError<{ code: string; message: string }>;
          const { response, message } = error;
          console.error("\n");
          console.error(url);
          // console.error(body, headers);
          console.error("POST request failed, because", response?.data);
          // console.log(response, message);
          if (response && response.status === 302) {
            return Result.Ok({
              headers: response.headers,
            });
          }
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
  async ensure_initialized() {
    return Result.Ok(null);
  }
  async ping() {
    "/api/portal/getUserSizeInfo.action";
    return Result.Ok(null);
  }
  /**
   * -------------------- 身份凭证相关 Start --------------------
   */
  async login(body: { pwd: string }) {
    const { pwd } = body;
    const username = this.unique_id;
    const password = pwd;
    const encrypt_key = config.pubKey;
    const r1 = await this.request.get<Record<string, string>>(
      "https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https://cloud.189.cn/web/redirect.html?returnURL=/main.action"
    );
    if (r1.error) {
      return Result.Err(`获取登录参数失败，因为 ${r1.error.message}`);
    }
    const query = r1.data;
    const r2 = await this.request.post<{
      result: number;
      msg: string;
      data: {
        returnUrl: string;
        paramId: string;
      };
    }>(
      "https://open.e.189.cn/api/logbox/oauth2/appConf.do",
      {
        version: "2.0",
        appKey: "cloud",
      },
      {
        transformRequest: [(data) => stringify(data)],
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:74.0) Gecko/20100101 Firefox/76.0",
          Referer: "https://open.e.189.cn/",
          lt: query.lt,
          REQID: query.reqId,
        },
      }
    );
    if (r2.error) {
      return Result.Err(r2.error);
    }
    const { result, msg, data } = r2.data;
    if (Number(result) !== 0) {
      return Result.Err(`构建登录信息失败，因为 ${msg}`);
    }
    const jsencrypt = new JSEncrypt();
    const key_header = `-----BEGIN PUBLIC KEY-----\n${encrypt_key}\n-----END PUBLIC KEY-----`;
    jsencrypt.setPublicKey(key_header);
    const username_encrypt = Buffer.from(jsencrypt.encrypt(username), "base64").toString("hex");
    const password_encrypt = Buffer.from(jsencrypt.encrypt(password), "base64").toString("hex");
    const payload: Record<string, string | boolean> = {
      version: "v2.0",
      apToken: "",
      appKey: "cloud",
      accountType: "01",
      userName: `{NRP}${username_encrypt}`,
      password: `{NRP}${password_encrypt}`,
      captchaType: "",
      validateCode: "",
      smsValidateCode: "",
      captchaToken: "",
      returnUrl: data.returnUrl,
      mailSuffix: "@189.cn",
      dynamicCheck: "FALSE",
      clientType: "1",
      cb_SaveName: "0",
      isOauth2: false,
      state: "",
      paramId: data.paramId,
    };
    const search = Object.keys(payload)
      .map((k) => {
        if (k === "mailSuffix") {
          return `${k}=${payload[k]}`;
        }
        return `${k}=${encodeURIComponent(payload[k])}`;
      })
      .join("&");
    const url = "https://open.e.189.cn/api/logbox/oauth2/loginSubmit.do?" + search;
    const r3 = await this.request.post<{ result: number; msg: string; toUrl: string }>(
      url,
      {},
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:74.0) Gecko/20100101 Firefox/76.0",
          Referer: "https://open.e.189.cn/",
          lt: query.lt,
          REQID: query.reqId,
        },
      }
    );
    if (r3.error) {
      return Result.Err(`登录失败，因为 ${r3.error.message}`);
    }
    if (Number(r3.data.result) !== 0) {
      return Result.Err(`登录失败，因为 ${r3.data.msg}`);
    }
    const token_url = r3.data.toUrl.replace(/\?$/, "");
    const client = axios.create({
      timeout: 6000,
      maxRedirects: 0,
      withCredentials: true,
    });
    try {
      await client.get<{ result: string; headers: { Cookie: string } }>(token_url, {
        headers: {
          "User-Agent": `Mozilla/5.0 (Linux; U; Android 11; ${config.model} Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.136 Mobile Safari/537.36 Ecloud/${config.version} Android/30 clientId/${config.clientId} clientModel/${config.model} clientChannelId/qq proVersion/1.0.6`,
          Referer: "https://m.cloud.189.cn/zhuanti/2016/sign/index.jsp?albumBackupOpened=1",
          "Accept-Encoding": "gzip, deflate",
          Host: "cloud.189.cn",
        },
      });
    } catch (err) {
      const { response } = err as AxiosError;
      if (response && response.status === 302) {
        const headers = response.headers;
        const cookies = headers["set-cookie"] || [];
        const cookie = cookies.find((c) => c.includes("COOKIE_LOGIN_USER"));
        if (!cookie) {
          return Result.Err("缺少 COOKIE_LOGIN_USER");
        }
        const r = cookie.match(/COOKIE_LOGIN_USER=([A-Z0-9]{1,})/);
        if (!r) {
          return Result.Err("缺少 COOKIE_LOGIN_USER");
        }
        const token = r[1];
        this.token = token;
        return Result.Ok(token);
      }
    }
    return Result.Err("获取 Cookie 失败");
  }
  /** 刷新 token */
  async refresh_access_token() {
    const drive = await this.store.prisma.drive.findUnique({
      where: {
        id: this.id,
      },
      include: {
        drive_token: true,
      },
    });
    if (!drive) {
      return Result.Err("刷新 token 失败，因为没有匹配的记录");
    }
    const r = parseJSONStr<{ refresh_token: string }>(drive.drive_token.data);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { refresh_token } = r.data;
    const password = refresh_token;
    const r2 = await this.login({ pwd: password });
    if (r2.error) {
      return Result.Err(`刷新 token 失败，因为 ${r2.error.message}`);
    }
    const token = r2.data;
    this.token = token;
    await this.store.prisma.drive_token.update({
      where: {
        id: drive.drive_token_id,
      },
      data: {
        updated: dayjs().toISOString(),
        data: JSON.stringify({ access_token: token, refresh_token }),
      },
    });
    return Result.Ok(token);
  }
  /**
   * -------------------- 文件管理相关 Start --------------------
   */
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
    const { page_size = 20, page, sort = [{ field: "name", order: "desc" }] } = options;
    await sleep(800);
    const r = await this.request.get<{
      fileListAO: {
        count: number;
        fileList: Cloud189DriveFileResp[];
        fileListSize: number;
        folderList: Cloud189DriveFileResp[];
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
  async fetch_file(file_id = DEFAULT_ROOT_FOLDER_ID) {
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
      items: Cloud189DriveFileResp[];
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
    const { parent_file_id = DEFAULT_ROOT_FOLDER_ID, name } = params;
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
    target_drive_client: Cloud189DriveClient;
    target_folder_id?: string;
  }) {
    return Result.Err("请实现该方法");
  }
  async fetch_video_preview_info(file_id: string) {
    const e = await this.ensure_initialized();
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
    return Result.Err("请实现 fetch_video_preview_info 方法");
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
      items: Cloud189DriveFileResp[];
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
      items: Cloud189DriveFileResp[];
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
  async save_quick_shared_resource(body: { url: string }) {
    await this.ensure_initialized();
    return Result.Err("请实现该方法");
  }
  /** 签到 */
  async checked_in() {
    await this.ensure_initialized();
    const result = [];
    const url = `https://cloud.189.cn/mkt/userSign.action?rand=${new Date().getTime()}&clientType=TELEANDROID&version=${
      config.version
    }&model=${config.model}`;
    const r = await this.request.get<{ errorCode: string; isSign: string; netdiskBonus: string }>(url);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { errorCode, netdiskBonus, isSign } = r.data;
    const r2 = await this.lottery();
    if (isSign) {
      return Result.Err("已经签到过了");
    }
    return Result.Ok({
      texts: [`签到获得${netdiskBonus}M空间`],
    });
  }
  /** 抽奖 */
  async lottery() {
    await this.ensure_initialized();
    const tasks = [
      {
        url: "https://m.cloud.189.cn/v2/drawPrizeMarketDetails.action?taskId=TASK_SIGNIN&activityId=ACT_SIGNIN",
      },
      {
        url: "https://m.cloud.189.cn/v2/drawPrizeMarketDetails.action?taskId=TASK_SIGNIN_PHOTOS&activityId=ACT_SIGNIN",
      },
      {
        url: "https://m.cloud.189.cn/v2/drawPrizeMarketDetails.action?taskId=TASK_2022_FLDFS_KJ&activityId=ACT_SIGNIN",
      },
    ];
    const result: string[] = [];
    for (let index = 0; index < tasks.length; index += 1) {
      await (async () => {
        const task = tasks[index];
        const r = await this.request.get<{ errorCode: string; prizeName: string }>(task.url);
        if (r.error) {
          result.push(r.error.message);
          return;
        }
        const { errorCode, prizeName } = r.data;
        if (errorCode === "User_Not_Chance") {
          result.push(`第${index + 1}次抽奖失败,次数不足`);
          return;
        }
        result.push(`第${index + 1}次抽奖成功,抽奖获得${prizeName}`);
      })();
    }
    return Result.Ok(result);
  }
  async refresh_profile() {
    return Result.Err("请实现该方法");
  }
  async fetch_video_preview_info_for_download() {
    return Result.Err("请实现 fetch_video_preview_info_for_download 方法");
  }
  async generate_thumbnail() {
    return Result.Err("请实现 generate_thumbnail 方法");
  }
}
