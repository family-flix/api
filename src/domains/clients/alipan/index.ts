/**
 * @file 阿里云盘
 * @doc https://www.yuque.com/aliyundrive/zpfszx
 */
import fs from "fs";
import crypto from "crypto";

import Joi from "joi";
import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";
import dayjs, { Dayjs } from "dayjs";

import { DataStore, DriveRecord } from "@/domains/store/types";
import { User } from "@/domains/user/index";
import { DriveTypes } from "@/domains/drive/constants";
import { Article, ArticleLineNode, ArticleSectionNode, ArticleTextNode } from "@/domains/article";
import { AliyunShareResourceClient } from "@/domains/clients/aliyun_resource";
import { build_drive_file, run } from "@/domains/clients/utils";
import { DriveClient, GenreDriveFile } from "@/domains/clients/types";
import { BaseDomain, Handler } from "@/domains/base";
import { parseJSONStr, query_stringify, r_id, sleep } from "@/utils/index";
import { MediaResolutionTypes } from "@/constants/index";
import { Result, resultify, Unpacked } from "@/types/index";

import { AliyunDriveFileResp, AliyunDriveToken, PartialVideo, AliyunDriveProfile, AliyunDrivePayload } from "./types";
import { get_part_info_list, prepare_upload_file, read_part_file, file_info } from "./utils";

const API_HOST = "https://api.aliyundrive.com";
const API_V2_HOST = "https://api.alipan.com";
const USER_API_HOST = "https://user.aliyundrive.com";
const MEMBER_API_HOST = "https://member.aliyundrive.com";
const MEMBER_API_V2_HOST = "https://member.alipan.com";
const PUBLIC_KEY =
  "04d9d2319e0480c840efeeb75751b86d0db0c5b9e72c6260a1d846958adceaf9dee789cab7472741d23aafc1a9c591f72e7ee77578656e6c8588098dea1488ac2a";
const SIGNATURE =
  "f4b7bed5d8524a04051bd2da876dd79afe922b8205226d65855d02b267422adb1e0d8a816b021eaf5c36d101892180f79df655c5712b348c2a540ca136e6b22001";
const COMMENT_HEADERS = {
  // authority: "api.aliyundrive.com",
  // Host: "api.aliyundrive.com",
  Cookie:
    "_nk_=t-2213376065375-52; _tb_token_=5edd38eb839fa; cookie2=125d9fb93ba60bae5e04cf3a4f1844ce; csg=7be2d6ea; munb=2213376065375; t=cc514082229d35fa6e4cb77f9607a31a; isg=BPv7iSICHO8ckiBhqmD_qx8rgNtlUA9S5UNxz-241_oRTBsudSCfohmeYGIC92dK; l=Al1dbs-eO-pLLQIH1VDqMyQKbSJXe5HM; cna=XiFcHCbGiCMCAX14pqXhM/U9",
  "content-type": "application/json; charset=UTF-8",
  accept: "*/*",
  "x-umt": "xD8BoI9LPBwSmhKGWfJem6nHQ7xstNFA",
  "x-sign": "izK9q4002xAAJGGHrNSHxqaOJAfmJGGEYjdc0ltNpMTdx5GeaXDSRaCtwKwEG0Rt2xgVv6dPLJBixqXoMb0l07OzsyxxtGGEYbRhhG",
  "x-canary": "client=web,app=adrive,version=v4.9.0",
  "x-sgext":
    "JAdnylkEyyzme4p+deZ0j8pS+lbpVvxQ/FXpVvhV6UT7Uf1R/Fb7X/5V6Vf6V/xX+lf6V/pX+lf6V/pE+kT6RPpX6Vf6V/pE+kT6RPpE+kT6RPpE+kT6RPpX+lf6",
  "accept-language": "en-US,en;q=0.9",
  "x-mini-wua":
    "iMgQmyQ0xADdEBzKwoGPtradgjIKF60kuQM769eBYB2c50VY3P9sTHE9tE0cGiP5vuxcym4QSf7t9oByybyv6yjXYIVOyToCAp95eIvBq5wBbCWvYsWC59frqvGYDlw7wmbOPxp04i3dZUs3Af6Y2dQDY+TG5eOUXMeaMAT7qFkinOA==",
  "user-agent":
    "AliApp(AYSD/4.4.0) com.alicloud.smartdrive/4.4.0 Version/16.3 Channel/201200 Language/en-CN /iOS Mobile/iPhone12,3",
  referer: "https://aliyundrive.com/",
  origin: "https://aliyundrive.com/",
};
const DEFAULT_ROOT_FOLDER_ID = "root";

type RequestClient = {
  get: <T>(
    url: string,
    query?: Record<string, string | number | undefined | null>,
    extra?: Partial<AxiosRequestConfig>
  ) => Promise<Result<T>>;
  post: <T>(url: string, body?: Record<string, unknown>, headers?: Record<string, unknown>) => Promise<Result<T>>;
};
enum Events {
  TransferFinish,
  TransferFailed,
  Print,
  StateChange,
}
type TheTypesOfEvents = {
  [Events.TransferFinish]: void;
  [Events.TransferFailed]: Error;
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.StateChange]: AliyunDriveState;
};
type AliyunDriveProps = {
  id: string;
  unique_id: string;
  token_id?: string;
  resource_drive_id: string | null;
  device_id: string;
  root_folder_id: string | null;
  access_token: string;
  refresh_token: string;
  store: DataStore;
};
type AliyunDriveState = {};

export class AliyunDriveClient extends BaseDomain<TheTypesOfEvents> implements DriveClient {
  static async Get(options: Partial<{ id?: string; unique_id?: string; user?: User; store: DataStore }>) {
    const { id, unique_id, user, store } = options;
    if (!store) {
      return Result.Err("缺少数据库实例");
    }
    if (!id && !unique_id) {
      return Result.Err("缺少云盘 id");
    }
    const where: Partial<{ id: string; unique_id: string; user_id: string }> = id
      ? { id }
      : { unique_id: String(unique_id) };
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
    const r = parseJSONStr<AliyunDriveProfile>(drive.profile);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { device_id, resource_drive_id } = r.data;
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
      new AliyunDriveClient({
        id: drive.id,
        unique_id: drive.unique_id,
        device_id,
        token_id,
        resource_drive_id: resource_drive_id || null,
        root_folder_id: drive.root_folder_id,
        access_token,
        refresh_token,
        store,
      })
    );
  }
  static async Create(body: { payload: unknown; skip_ping?: boolean; store: DataStore; user: User }) {
    const { payload, skip_ping, store, user } = body;
    const aliyun_drive_schema = Joi.object({
      app_id: Joi.string().required(),
      drive_id: Joi.number().required(),
      device_id: Joi.string().required(),
      user_name: Joi.string().allow(null, ""),
      nick_name: Joi.string().allow(null, ""),
      avatar: Joi.string().allow(null, ""),
      user_id: Joi.string().required(),
      access_token: Joi.string().required(),
      refresh_token: Joi.string().required(),
      name: Joi.string().allow(null, ""),
      root_folder_id: Joi.string().allow(null, ""),
      used_size: Joi.number().allow(null, 0),
      total_size: Joi.number().allow(null, 0),
    });
    const r = await resultify(aliyun_drive_schema.validateAsync.bind(aliyun_drive_schema))(payload);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const {
      app_id,
      drive_id,
      resource_drive_id,
      device_id,
      avatar,
      user_id: aliyun_user_id,
      name,
      user_name,
      nick_name,
      access_token,
      refresh_token,
      root_folder_id,
      used_size,
      total_size,
    } = r.data as AliyunDrivePayload;
    // console.log("[DOMAINS]Drive - Add", drive_id);
    const existing_drive = await store.prisma.drive.findUnique({
      where: {
        user_id_unique_id: {
          unique_id: String(drive_id),
          user_id: user.id,
        },
      },
    });
    if (existing_drive) {
      return Result.Err("该云盘已存在，请检查信息后重试", undefined, { id: existing_drive.id });
    }
    const drive_record_id = r_id();
    const client = new AliyunDriveClient({
      id: drive_record_id,
      unique_id: String(drive_id),
      resource_drive_id,
      device_id,
      access_token,
      refresh_token,
      root_folder_id,
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
        name: name || user_name || nick_name,
        avatar,
        type: DriveTypes.AliyunBackupDrive,
        unique_id: String(drive_id),
        profile: JSON.stringify({
          avatar,
          user_name,
          nick_name,
          app_id,
          drive_id: String(drive_id),
          resource_drive_id,
          device_id,
          user_id: aliyun_user_id,
        } as AliyunDriveProfile),
        root_folder_id: root_folder_id || null,
        used_size: used_size || 0,
        total_size: total_size || 0,
        drive_token: {
          create: {
            id: r_id(),
            data: JSON.stringify({
              access_token,
              refresh_token,
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
  static async CreateResourceDrive(body: { payload: unknown; skip_ping?: boolean; store: DataStore; user: User }) {
    const { payload, skip_ping, store, user } = body;
    const { drive_id, unique_id } = payload as { drive_id: string; unique_id: string };
    // console.log("[DOMAIN]drive/index - before store.prisma.drive.findFirst", drive_id);
    const existing_drive = await store.prisma.drive.findFirst({
      where: {
        OR: [
          drive_id
            ? {
                id: drive_id,
              }
            : {},
          unique_id
            ? {
                unique_id: String(unique_id),
              }
            : {},
        ].filter((v) => Object.keys(v).length > 0),
        user_id: user.id,
      },
      include: {
        drive_token: true,
      },
    });
    // console.log("[DOMAIN]drive/index - before !existing_drive", existing_drive);
    if (!existing_drive) {
      return Result.Err("没有匹配的云盘记录");
    }
    const { avatar, name, profile, root_folder_id, drive_token, used_size, total_size } = existing_drive;
    const r = parseJSONStr<AliyunDriveProfile>(profile);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { resource_drive_id, device_id, user_id, app_id, nick_name, user_name } = r.data;
    let _resource_drive_id = resource_drive_id;
    const r2 = parseJSONStr<{ access_token: string; refresh_token: string }>(drive_token.data);
    // console.log("[DOMAIN]drive/index - after r2");
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    const { access_token, refresh_token } = r2.data;
    if (!_resource_drive_id) {
      const client = new AliyunDriveClient({
        id: "",
        unique_id: String(drive_id),
        resource_drive_id: "",
        device_id,
        access_token,
        refresh_token,
        root_folder_id,
        store,
      });
      const d = await client.ping();
      if (d.data) {
        _resource_drive_id = d.data.resource_drive_id;
      }
    }
    if (!_resource_drive_id) {
      return Result.Err("没有资源盘");
    }
    const existing_resource_drive = await store.prisma.drive.findFirst({
      where: {
        unique_id: String(_resource_drive_id),
        user_id: user.id,
      },
    });
    if (existing_resource_drive) {
      return Result.Err("该资源盘已存在，请检查信息后重试", undefined, { id: existing_resource_drive.id });
    }
    const drive_record_id = r_id();
    const client = new AliyunDriveClient({
      id: drive_record_id,
      unique_id: _resource_drive_id,
      device_id,
      access_token,
      refresh_token,
      root_folder_id,
      resource_drive_id: null,
      store,
    });
    // console.log("[DOMAIN]drive/index - before store.prisma.drive.create");
    const created_drive = await store.prisma.drive.create({
      data: {
        id: drive_record_id,
        name: `资源盘/${name}`,
        avatar,
        type: DriveTypes.AliyunResourceDrive,
        unique_id: String(_resource_drive_id),
        profile: JSON.stringify({
          avatar,
          user_name,
          nick_name,
          app_id,
          drive_id: String(_resource_drive_id),
          device_id,
          user_id,
          backup_drive_id: drive_id,
        } as AliyunDriveProfile),
        root_folder_id: root_folder_id || null,
        used_size: used_size || 0,
        total_size: total_size || 0,
        drive_token: {
          connect: {
            id: drive_token.id,
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

  /** 数据库云盘id */
  id: string;
  unique_id: string;
  token: string = "";
  root_folder: {
    id: string;
    name: string;
  } | null = null;

  token_id: string | null = null;
  resource_drive_id: string | null;
  /** 设备id */
  device_id: string;
  /** 访问凭证 */
  access_token: string;
  /** 刷新凭证 */
  refresh_token: string;
  /** 是否为登录状态 */
  is_login = false;
  used_size: number = 0;
  total_size: number = 0;
  expired_at: null | Dayjs = null;
  share_token: Record<
    string,
    {
      token: string;
      expired_at: number;
    }
  > = {};

  /** 请求客户端 */
  request: RequestClient;
  renew_session_timer: null | NodeJS.Timer = null;
  /**
   * 数据库操作
   * 由于 drive 依赖 access_token、refresh_token，必须有一个外部持久存储
   */
  store: DataStore;

  constructor(options: AliyunDriveProps) {
    super();

    const {
      id,
      unique_id,
      resource_drive_id,
      token_id,
      device_id,
      root_folder_id,
      access_token,
      refresh_token,
      store,
    } = options;
    this.id = id;
    this.unique_id = unique_id;
    if (token_id) {
      this.token_id = token_id;
    }
    this.resource_drive_id = resource_drive_id;
    this.device_id = device_id;
    if (root_folder_id) {
      this.root_folder = {
        id: root_folder_id,
        name: "",
      };
    }
    this.access_token = access_token;
    this.refresh_token = refresh_token;
    this.store = store;
    const client = axios.create({
      timeout: 6000,
    });
    this.request = {
      get: async (endpoint, query, extra: Partial<AxiosRequestConfig> = {}) => {
        // console.log("get request", this.access_token.slice(-10), endpoint);
        const url = `${endpoint}${query ? "?" + query_stringify(query) : ""}`;
        const headers = {
          ...COMMENT_HEADERS,
          authorization: this.access_token,
          "X-Device-Id": this.device_id,
          "x-signature": SIGNATURE,
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
            await this.refresh_aliyun_access_token();
          }
          return Result.Err(response?.data?.message || message);
        }
      },
      post: async (url, body, extra_headers = {}) => {
        // console.log("post request", this.access_token.slice(-10), url);
        const headers = {
          ...COMMENT_HEADERS,
          ...extra_headers,
          authorization: this.access_token,
          "x-device-id": this.device_id,
          "x-signature": SIGNATURE,
        };
        try {
          const resp = await client.post(url, body, {
            headers,
          });
          const { data } = resp;
          return Result.Ok(data);
        } catch (err) {
          const error = err as AxiosError<{ code: string; message: string }>;
          const { response, message } = error;
          console.error("\n");
          console.error(url);
          // console.error(body, headers);
          console.error("POST request failed, because", response?.data, response?.data?.code);
          // console.log(response, message);
          if (response?.status === 401) {
            if (response?.data?.code === "UserDeviceOffline") {
              await this.create_session();
            }
            if (response?.data?.code === "AccessTokenInvalid") {
              // ...
            }
            if (response?.data?.code === "DeviceSessionSignatureInvalid") {
              // ...
            }
            await this.refresh_aliyun_access_token();
          }
          return Result.Err(response?.data?.message || message, response?.data?.code);
        }
      },
    };
  }
  /** 初始化所有信息 */
  async init() {
    const token_res = await (async () => {
      const drive = await this.store.prisma.drive.findFirst({
        where: {
          id: this.id,
        },
        include: {
          drive_token: true,
        },
      });
      if (!drive) {
        return Result.Err("没有匹配的云盘凭证记录");
      }
      const { id, data, expired_at } = drive.drive_token;
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
      // this.token_id = token_id;
      this.access_token = access_token;
      // 这里赋值是为了下面 refresh_aliyun_access_token 中使用
      this.refresh_token = refresh_token;
      // console.log(
      //   "check has authoried",
      //   drive,
      //   expired_at,
      //   dayjs(expired_at * 1000).format("YYYY MM DD HH:mm:ss")
      // );
      if (!expired_at || dayjs(expired_at * 1000).isBefore(dayjs())) {
        // console.log("access token is expired, refresh it");
        const r1 = await this.refresh_aliyun_access_token();
        if (r1.error) {
          return Result.Err(r1.error);
        }
        const r2 = await this.create_session();
        if (r2.error) {
          return Result.Err(r2.error);
        }
        return Result.Ok(r1.data);
      }
      return Result.Ok({
        access_token,
        refresh_token,
      });
    })();
    // console.log("[DOMAIN]aliyundrive - init", token_res.data);
    if (token_res.error) {
      return Result.Err(token_res.error.message);
    }
    if (!this.resource_drive_id) {
      const r3 = await this.ping();
      // console.log("[DOMAIN]AliyunResourceDrive - init", r3.data, this.resource_drive_id);
      if (r3.error) {
        return Result.Err(r3.error.message);
      }
      await this.update_profile({
        resource_drive_id: r3.data.resource_drive_id,
      });
      this.resource_drive_id = r3.data.resource_drive_id;
    }
    const { access_token, refresh_token } = token_res.data;
    this.access_token = access_token;
    this.refresh_token = refresh_token;
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
  async refresh_profile() {
    const a = await this.ensure_initialized();
    if (a.error) {
      return Result.Err(a.error);
    }
    const r = await this.request.post<{
      drive_used_size: number;
      drive_total_size: number;
      default_drive_used_size: number;
      album_drive_used_size: number;
      share_album_drive_used_size: number;
      note_drive_used_size: number;
      sbox_drive_used_size: number;
    }>(API_HOST + "/adrive/v1/user/driveCapacityDetails");
    if (r.error) {
      return Result.Err(r.error);
    }
    const { drive_total_size, drive_used_size } = r.data;
    this.used_size = drive_used_size;
    this.total_size = drive_total_size;
    // if (!this.resource_drive_id) {
    //   const r3 = await this.ping();
    //   // console.log("[DOMAIN]AliyunResourceDrive - init", r3.data, this.resource_drive_id);
    //   if (r3.error) {
    //     return Result.Err(r3.error.message);
    //   }
    // console.log(r3.data);
    //   await this.update_profile({
    //     resource_drive_id: r3.data.resource_drive_id,
    //   });
    //   this.resource_drive_id = r3.data.resource_drive_id;
    // }
    return Result.Ok({
      id: this.id,
      used_size: this.used_size,
      total_size: this.total_size,
    });
  }
  /** 获取文件列表 */
  async fetch_files(
    file_id: string,
    options: Partial<{
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
    const { page_size = 20, marker, sort = [{ field: "name", order: "desc" }] } = options;
    await sleep(800);
    const r = await this.request.post<{
      items: AliyunDriveFileResp[];
      next_marker: string;
    }>(API_HOST + "/adrive/v3/file/list", {
      all: false,
      parent_file_id: file_id,
      drive_id: String(this.unique_id),
      limit: page_size,
      marker,
      ...sort
        .map((s) => {
          return {
            order_by: s.field,
            order_direction: s.order.toUpperCase(),
          };
        })
        .reduce((total, cur) => {
          return {
            ...total,
            ...cur,
          };
        }, {}),
      // order_by: "name",
      // order_direction: "DESC",
      image_thumbnail_process: "image/resize,w_256/format,jpeg",
      image_url_process: "image/resize,w_1920/format,jpeg/interlace,1",
      url_expire_sec: 14400,
      video_thumbnail_process: "video/snapshot,t_1000,f_jpg,ar_auto,w_256",
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const result = r.data.items.map((file) => {
      const { file_id, name, type, parent_file_id } = file;
      const data: GenreDriveFile = {
        type,
        file_id,
        name,
        parent_file_id,
        size: 0,
        md5: null,
        content_hash: null,
        mime_type: null,
        thumbnail: null,
      };
      return data;
    });
    return Result.Ok({
      items: result,
      next_marker: r.data.next_marker,
    });
  }
  /**
   * 获取单个文件或文件夹详情
   */
  async fetch_file(file_id = DEFAULT_ROOT_FOLDER_ID) {
    if (file_id === undefined) {
      return Result.Err("请传入文件 id");
    }
    await this.ensure_initialized();
    const r = await this.request.post<{
      /** id */
      file_id: string;
      /** 名称 */
      name: string;
      parent_file_id: string;
      /** 类型 */
      type: string;
      size: number;
      content_hash: string;
      mime_type: string;
      /** 缩略图 */
      thumbnail: string | null;
    }>(API_HOST + "/v2/file/get", {
      file_id,
      drive_id: String(this.unique_id),
      image_thumbnail_process: "image/resize,w_256/format,jpeg",
      image_url_process: "image/resize,w_1920/format,jpeg/interlace,1",
      url_expire_sec: 1600,
      video_thumbnail_process: "video/snapshot,t_1000,f_jpg,ar_auto,w_256",
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { file_id: id, name, size, type, parent_file_id, content_hash = null, thumbnail = null } = r.data;
    const data: GenreDriveFile = {
      type,
      file_id: id,
      name,
      parent_file_id,
      size,
      content_hash,
      md5: null,
      mime_type: null,
      thumbnail,
    };
    return Result.Ok(data);
  }
  /** 添加文件夹 */
  async create_folder(
    params: { parent_file_id?: string; name: string },
    options: Partial<{ check_name_mode: "refuse" | "auto_rename" | "ignore" }> = {}
  ) {
    const { parent_file_id = DEFAULT_ROOT_FOLDER_ID, name } = params;
    const { check_name_mode = "refuse" } = options;
    if (!name) {
      return Result.Err("缺少文件夹名称");
    }
    await this.ensure_initialized();
    const r = await this.request.post<{
      file_id: string;
      file_name: string;
      parent_file_id: string;
    }>(API_HOST + "/adrive/v2/file/createWithFolders", {
      check_name_mode,
      drive_id: String(this.unique_id),
      name,
      parent_file_id,
      type: "folder",
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const { file_id, file_name, parent_file_id: parent_folder_id } = r.data;
    const result: GenreDriveFile = {
      type: "folder",
      file_id,
      name: file_name,
      parent_file_id,
      size: 0,
      content_hash: null,
      md5: null,
      mime_type: null,
      thumbnail: null,
    };
    return Result.Ok(result);
  }
  /** 获取文件下载地址 */
  async fetch_file_download_url(file_id: string) {
    await this.ensure_initialized();
    const r = await this.fetch_file(file_id);
    if (r.error) {
      return Result.Err(r.error);
    }
    const r2 = await this.request.post<{
      domain_id: string;
      drive_id: string;
      file_id: string;
      revision_id: string;
      method: string;
      url: string;
      internal_url: string;
      expiration: string;
      size: number;
      crc64_hash: string;
      content_hash: string;
      content_hash_name: string;
      punish_flag: number;
      meta_name_punish_flag: number;
      meta_name_investigation_status: number;
    }>(API_HOST + "/v2/file/get_download_url", {
      file_id,
      drive_id: String(this.unique_id),
    });
    if (r2.error) {
      return Result.Err(r2.error);
    }
    return Result.Ok({
      ...r.data,
      url: r2.data.url,
    });
  }
  /** 获取一个文件的详细信息，包括其路径 */
  async fetch_file_paths(file_id: string) {
    await this.ensure_initialized();
    const r = await this.fetch_file(file_id);
    if (r.error) {
      return Result.Err(r.error);
    }
    const r2 = await this.request.post<{
      items: {
        /** id */
        file_id: string;
        /** 名称 */
        name: string;
        parent_file_id: string;
        /** 类型 */
        type: string;
      }[];
    }>(API_HOST + "/adrive/v1/file/get_path", {
      file_id,
      drive_id: String(this.unique_id),
    });
    if (r2.error) {
      return r2;
    }
    return Result.Ok({
      ...r.data,
      paths: r2.data.items
        .reverse()
        .map((f) => f.name)
        .join("/"),
    });
  }
  /**
   * 重命名文件夹或文件
   */
  async rename_file(
    file_id: string,
    next_name: string,
    options: Partial<{ check_name_mode: "auto_rename" | "refuse" | "ignore" }> = {}
  ) {
    const { check_name_mode = "refuse" } = options;
    if (file_id === undefined) {
      return Result.Err("请传入 file_id");
    }
    await this.ensure_initialized();
    const r = await this.request.post<{
      drive_id: string;
      domain_id: string;
      file_id: string;
      name: string;
      type: string;
      created_at: string;
      updated_at: string;
      hidden: boolean;
      starred: boolean;
      status: string;
      parent_file_id: string;
      encrypt_mode: string;
      creator_type: string;
      creator_id: string;
      last_modifier_type: string;
      last_modifier_id: string;
      revision_id: string;
      sync_flag: boolean;
      sync_device_flag: boolean;
      sync_meta: string;
      trashed: boolean;
    }>(API_HOST + "/v3/file/update", {
      check_name_mode,
      drive_id: String(this.unique_id),
      file_id,
      name: next_name,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { name, type, parent_file_id } = r.data;
    const data: GenreDriveFile = {
      type,
      file_id,
      name,
      parent_file_id,
      size: 0,
      md5: null,
      content_hash: null,
      mime_type: null,
      thumbnail: null,
    };
    return Result.Ok(data);
  }
  async fetch_parent_paths_of_folder(folder: { file_id: string }) {
    await this.ensure_initialized();
    const { file_id } = folder;
    const result = await this.request.post<{
      items: {
        file_id: string;
        name: string;
        parent_file_id: string;
        type: "folder" | "file";
      }[];
    }>(API_HOST + "/adrive/v1/file/get_path", {
      file_id,
      drive_id: String(this.unique_id),
    });
    return result;
  }
  async fetch_video_preview_info(file_id: string) {
    const e = await this.ensure_initialized();
    if (e.error) {
      return Result.Err(e.error.message);
    }
    // console.log("[DOMAIN]aliyundrive/fetch_video_preview_info", file_id, this.drive_id);
    const r = await this.request.post<{
      video_preview_play_info: {
        category: string;
        meta: {
          duration: number;
          width: number;
          height: number;
        };
        live_transcoding_task_list: PartialVideo[];
        live_transcoding_subtitle_task_list: {
          language: "chi" | "eng" | "jpn";
          status: string;
          url: string;
        }[];
      };
    }>(API_HOST + "/v2/file/get_video_preview_play_info", {
      file_id,
      drive_id: String(this.unique_id),
      category: "live_transcoding",
      template_id: "QHD|FHD|HD|SD|LD",
      // 60s * 6min * 2h
      url_expire_sec: 60 * 60 * 2,
      get_subtitle_info: true,
      // with_play_cursor: false,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    if (!r.data.video_preview_play_info) {
      return Result.Err("no video_preview_play_info");
    }
    const {
      video_preview_play_info: { live_transcoding_task_list, live_transcoding_subtitle_task_list = [] },
    } = r.data;
    const sources = format_M3U8_manifest(live_transcoding_task_list);
    return Result.Ok({
      sources,
      subtitles: live_transcoding_subtitle_task_list
        .filter((subtitle) => {
          return subtitle.status === "finished";
        })
        .map((subtitle) => {
          const { url, language } = subtitle;
          return {
            id: url,
            name: url,
            url,
            language,
          };
        }),
    });
  }
  async fetch_video_preview_info_for_download(file_id: string) {
    const e = await this.ensure_initialized();
    if (e.error) {
      return Result.Err(e.error.message);
    }
    // console.log("[DOMAIN]aliyundrive/fetch_video_preview_info", file_id, this.drive_id);
    const r = await this.request.post<{
      domain_id: string;
      drive_id: string;
      file_id: string;
      category: string;
      video_preview_play_info: {
        category: string;
        meta: {
          duration: number;
          width: number;
          height: number;
        };
        live_transcoding_task_list: {
          template_id: string;
          template_name: string;
          template_width: number;
          template_height: number;
          status: string;
          stage: string;
          /** 下载地址 */
          url: string;
        }[];
      };
      punish_flag: number;
      meta_name_punish_flag: number;
      meta_name_investigation_status: number;
    }>(API_HOST + "/v2/file/get_video_preview_play_info_for_download", {
      file_id,
      drive_id: String(this.unique_id),
      category: "live_transcoding",
      template_id: "",
      // 60s * 6min * 2h
      url_expire_sec: 60 * 60 * 2,
      get_subtitle_info: false,
      mode: "high_res",
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    if (!r.data.video_preview_play_info) {
      return Result.Err("no video_preview_play_info");
    }
    const {
      video_preview_play_info: { live_transcoding_task_list },
    } = r.data;
    return Result.Ok({
      sources: live_transcoding_task_list.map((source) => {
        const { template_id, template_width, template_height, template_name, url } = source;
        return {
          type: template_id as MediaResolutionTypes,
          url,
          width: template_width,
          height: template_height,
        };
      }),
    });
  }
  /**
   * 按名字模糊搜索文件/文件夹
   */
  async search_files(body: { name: string; type?: "file" | "folder"; marker?: string }) {
    const { name, type, marker } = body;
    await this.ensure_initialized();
    let query = `name match "${name}"`;
    if (type) {
      query += ` and type = "${type}"`;
    }
    const r = await this.request.post<{
      items: AliyunDriveFileResp[];
      next_marker: string;
    }>(API_HOST + "/adrive/v3/file/search", {
      drive_id: String(this.unique_id),
      image_thumbnail_process: "image/resize,w_200/format,jpeg",
      image_url_process: "image/resize,w_1920/format,jpeg",
      limit: 20,
      order_by: "updated_at DESC",
      query,
      video_thumbnail_process: "video/snapshot,t_1000,f_jpg,ar_auto,w_300",
      marker,
    });
    if (r.error) {
      return r;
    }
    const result = r.data.items.map((file) => {
      const { file_id, name, type, parent_file_id } = file;
      const data: GenreDriveFile = {
        type,
        file_id,
        name,
        parent_file_id,
        size: 0,
        mime_type: null,
        md5: null,
        content_hash: null,
        thumbnail: null,
      };
      return data;
    });
    return Result.Ok({
      items: result,
      next_marker: r.data.next_marker,
    });
  }
  /** 获取一个文件夹的完整路径（包括自身） */
  async fetch_parent_paths(file_id: string) {
    await this.ensure_initialized();
    const url = "/adrive/v1/file/get_path";
    const result = await this.request.post<{
      items: {
        name: string;
        file_id: string;
        parent_file_id: string;
        type: "file" | "folder";
      }[];
    }>(API_HOST + url, {
      drive_id: String(this.unique_id),
      file_id,
    });
    if (result.error) {
      return Result.Err(result.error.message);
    }
    return Result.Ok(result.data.items.reverse());
  }
  /** 根据名称判断一个文件是否已存在 */
  async existing(parent_file_id: string, file_name: string) {
    await this.ensure_initialized();
    const url = "/adrive/v3/file/search";
    const result = await this.request.post<{
      items: AliyunDriveFileResp[];
      next_marker: string;
    }>(API_HOST + url, {
      drive_id: String(this.unique_id),
      limit: 100,
      order_by: "name ASC",
      query: `parent_file_id = "${parent_file_id}" and (name = "${file_name}")`,
    });
    if (result.error) {
      return Result.Err(result.error);
    }
    if (result.data.items.length === 0) {
      return Result.Ok(null);
    }
    const { file_id, name, type, parent_file_id: parent_folder_id } = result.data.items[0];
    const data: GenreDriveFile = {
      type,
      file_id,
      name,
      parent_file_id: parent_folder_id,
      size: 0,
      mime_type: null,
      md5: null,
      content_hash: null,
      thumbnail: null,
    };
    return Result.Ok(data);
  }
  /** 保证一个文件夹必定存在，如果不存在，就创建 */
  async ensure_dir(
    paths: string[],
    parent_file_id: string = DEFAULT_ROOT_FOLDER_ID,
    files: { file_id: string; name: string }[] = []
  ): Promise<
    Result<
      {
        file_id: string;
        name: string;
      }[]
    >
  > {
    if (paths.length === 0) {
      return Result.Ok(files);
    }
    let [p, ...rest_paths] = paths;
    const exiting_res = await this.existing(p, parent_file_id);
    if (exiting_res.error) {
      return Result.Err(exiting_res.error);
    }
    let parent_file = exiting_res.data
      ? {
          file_id: exiting_res.data.file_id,
          name: exiting_res.data.name,
        }
      : null;
    if (!exiting_res.data) {
      const r = await this.create_folder({
        name: p,
        parent_file_id,
      });
      if (r.error) {
        return Result.Err(r.error);
      }
      parent_file = {
        file_id: r.data.file_id,
        name: r.data.name,
      };
    }
    if (!parent_file) {
      return Result.Err("异常");
    }
    return this.ensure_dir(rest_paths, parent_file.file_id, files.concat(parent_file));
  }
  /** 移动指定文件到指定文件夹 */
  async move_files_to_folder(body: { files: { file_id: string }[]; target_folder_id: string }) {
    await this.ensure_initialized();
    const { files, target_folder_id } = body;
    const r = await this.request.post<{
      items: AliyunDriveFileResp[];
    }>(API_HOST + "/v3/batch", {
      drive_id: String(this.unique_id),
      requests: files.map((file) => {
        const { file_id } = file;
        return {
          body: {
            file_id,
            to_parent_file_id: target_folder_id,
            to_drive_id: String(this.unique_id),
            drive_id: String(this.unique_id),
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
    const result = r.data.items.map((file) => {
      const { file_id, name, type, parent_file_id } = file;
      const data: GenreDriveFile = {
        type,
        file_id,
        name,
        parent_file_id,
        size: 0,
        mime_type: null,
        md5: null,
        content_hash: null,
        thumbnail: null,
      };
      return data;
    });
    return Result.Ok(result);
  }
  /** 获取指定视频在指定秒数下的缩略图 */
  async generate_thumbnail(values: { file_id: string; cur_time: string }) {
    const { file_id, cur_time } = values;
    await this.ensure_initialized();
    const result = await this.request.get<{ responseUrl: string }>(
      API_HOST + "/v2/file/download",
      {
        drive_id: String(this.unique_id),
        file_id,
        video_thumbnail_process: `video/snapshot,t_${cur_time},f_jpg,w_480,ar_auto,m_fast`,
      },
      {
        headers: {
          authorization: this.access_token,
          accept: "image/webp,image/avif,image/*,*/*;q=0.8",
        },
        responseType: "stream",
      }
    );
    if (result.error) {
      return result;
    }
    return Result.Ok(result.data);
  }
  async fetch_share_token(body: { url: string; code?: string }) {
    const { url, code } = body;
    const matched_share_id = url.match(/\/s\/([a-zA-Z0-9]{1,})$/);
    if (!matched_share_id) {
      return Result.Err("Invalid url, it must includes share_id like 'hFgvpSXzCYd' at the end of url");
    }
    const share_id = matched_share_id[1];
    const r1 = await this.request.post<{
      expire_time: string;
      expires_in: number;
      share_token: string;
    }>("/v2/share_link/get_share_token", {
      share_id,
      share_pwd: code,
    });
    return r1;
  }
  /**
   * 获取分享详情
   * @param url 分享链接
   */
  async fetch_share_profile(url: string, options: Partial<{ code: string | null; force: boolean }> = {}) {
    // console.log("[DOMAIN]fetch_share_profile", url, options);
    const { code, force = false } = options;
    const r = AliyunShareResourceClient.GetShareId(url);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const share_id = r.data;
    if (this.share_token[share_id] && force === false) {
      // 如果曾经调用过该方法获取到了 share_token，再次调用时就不会真正去调用了，而是复用之前获取到的
      return Result.Ok({
        share_id,
        share_token: this.share_token[share_id].token,
        share_name: undefined,
        share_title: undefined,
        files: [] as { file_id: string; file_name: string; type: "folder" | "file" }[],
      });
    }
    await this.ensure_initialized();
    const r1 = await this.request.post<{
      creator_id: string;
      share_name: string;
      share_title: string;
      file_infos: {
        file_id: string;
        file_name: string;
        type: "folder" | "file";
      }[];
    }>(API_HOST + "/adrive/v2/share_link/get_share_by_anonymous", {
      share_id,
      code,
    });
    if (r1.error) {
      // delete this.share_token[share_id];
      return Result.Err(r1.error);
    }
    const share_token_resp = await (async () => {
      if (!this.share_token[share_id]) {
        const r2 = await this.request.post<{
          share_token: string;
          expire_time: string;
          expires_in: number;
        }>(API_HOST + "/v2/share_link/get_share_token", {
          share_id,
          share_pwd: code,
        });
        if (r2.error) {
          return Result.Err(r2.error);
        }
        const { share_token, expires_in } = r2.data;
        this.share_token[share_id] = {
          token: share_token,
          expired_at: dayjs().add(expires_in, "second").valueOf(),
        };
        // this.share_token_expired_at = dayjs().add(expires_in, "second").valueOf();
        return Result.Ok({
          share_token,
        });
      }
      return Result.Ok({
        share_token: this.share_token[share_id].token,
      });
    })();
    if (share_token_resp.error) {
      return Result.Err(share_token_resp.error);
    }
    const token = share_token_resp.data.share_token;
    const { share_name, share_title, file_infos = [] } = r1.data;
    this.share_token[share_id] = {
      token,
      expired_at: 0,
    };
    return Result.Ok({
      share_token: token,
      share_id,
      share_name,
      share_title,
      files: file_infos,
    });
  }
  /** 获取分享资源文件列表 */
  async fetch_resource_files(
    file_id: string,
    options: Partial<{
      page_size: number;
      share_id: string;
      url: string;
      marker: string;
    }>
  ) {
    const { page_size = 20, share_id, marker } = options;
    if (this.share_token === null) {
      return Result.Err("Please invoke fetch_share_profile first");
    }
    if (!share_id) {
      return Result.Err("Please invoke fetch_share_profile first");
    }
    const token = this.share_token[share_id];
    const r3 = await this.request.post<{
      items: AliyunDriveFileResp[];
      next_marker: string;
    }>(
      API_HOST + "/adrive/v2/file/list_by_share",
      {
        image_thumbnail_process: "image/resize,w_256/format,jpeg",
        image_url_process: "image/resize,w_1920/format,jpeg/interlace,1",
        limit: page_size,
        order_by: "name",
        order_direction: "DESC",
        parent_file_id: file_id,
        marker,
        share_id,
        video_thumbnail_process: "video/snapshot,t_1000,f_jpg,ar_auto,w_256",
      },
      {
        "x-share-token": this.share_token[share_id].token,
      }
    );
    if (r3.error) {
      return Result.Err(r3.error.message);
    }
    const files = r3.data.items.map((file) => {
      const { file_id, name, type, parent_file_id } = file;
      const data = build_drive_file({
        file_id,
        name,
        type,
        parent_file_id,
      });
      return data;
    });
    return Result.Ok({
      items: files,
      next_marker: r3.data.next_marker,
    });
  }
  async fetch_shared_file(file_id: string, options: { share_id?: string } = {}) {
    const { share_id } = options;
    if (this.share_token === null) {
      return Result.Err("Please invoke fetch_share_profile first");
    }
    if (!share_id) {
      return Result.Err("Please invoke fetch_share_profile first");
    }
    const r3 = await this.request.post<{
      drive_id: string;
      domain_id: string;
      file_id: string;
      share_id: string;
      name: string;
      type: string;
      created_at: string;
      updated_at: string;
      file_extension: string;
      mime_type: string;
      mime_extension: string;
      size: number;
      parent_file_id: string;
      thumbnail: string;
      category: string;
      video_media_metadata: {
        width: number;
        height: number;
        duration: string;
      };
      punish_flag: number;
      revision_id: string;
      ex_fields_info: {
        video_meta_processed: string;
      };
    }>(
      API_HOST + "/adrive/v2/file/get_by_share",
      {
        drive_id: "",
        fields: "*",
        file_id,
        share_id,
      },
      {
        "x-share-token": this.share_token[share_id].token,
      }
    );
    if (r3.error) {
      return Result.Err(r3.error.message);
    }
    const { name, type, parent_file_id } = r3.data;
    const file = build_drive_file({
      file_id,
      name,
      type,
      parent_file_id,
    });
    return Result.Ok(file);
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
    const { page_size = 20, url, share_id } = options;
    if (this.share_token === null) {
      return Result.Err("Please invoke fetch_share_profile first");
    }
    if (!share_id) {
      return Result.Err("Please invoke fetch_share_profile first");
    }
    const share_token = this.share_token[share_id]?.token;
    // console.log("[DOMAIN]aliyundrive/index - search_shared_files", share_token);
    // if (!share_token) {
    //   if (!url) {
    //     return Result.Err("缺少 token 而且缺少 url");
    //   }
    //   await this.fetch_share_profile(url, options);
    // }
    const r3 = await this.request.post<{
      items: AliyunDriveFileResp[];
    }>(
      API_HOST + "/recommend/v1/shareLink/search",
      {
        keyword,
        limit: page_size,
        order_by: "name DESC",
        share_id,
      },
      {
        "x-share-token": share_token,
      }
    );
    if (r3.error) {
      return Result.Err(r3.error.message);
    }
    const files = r3.data.items.map((file) => {
      const { file_id, name, type, parent_file_id } = file;
      const data = build_drive_file({
        file_id,
        name,
        type,
        parent_file_id,
      });
      return data;
    });
    return Result.Ok({
      items: files,
    });
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
    const { url, code, file_id, target_file_id = this.root_folder?.id } = options;
    if (!target_file_id) {
      return Result.Err("请指定转存到云盘哪个文件夹");
    }
    const r1 = await this.fetch_share_profile(url, { code });
    if (r1.error) {
      return Result.Err(r1.error);
    }
    if (this.share_token === null) {
      return Result.Err("请先调用 fetch_share_profile 方法");
    }
    if (!r1.data.share_id) {
      return Result.Err("请先调用 fetch_share_profile 方法");
    }
    const { share_id, share_title, share_name } = r1.data;
    // console.log("target folder id", target_file_id, this.unique_id, share_id, file_id);
    const r2 = await this.request.post(
      API_HOST + "/v2/file/copy",
      {
        share_id,
        file_id,
        to_parent_file_id: target_file_id,
        to_drive_id: String(this.unique_id),
      },
      {
        "x-share-token": this.share_token[r1.data.share_id].token,
      }
    );
    if (r2.error) {
      return Result.Err(r2.error);
    }
    return Result.Ok({
      share_id,
      share_title,
      share_name,
    });
  }
  /** 一次转存多个分享的文件 */
  async save_multiple_shared_files(options: {
    /** 分享链接 */
    url: string;
    /** 提取码 */
    code?: string | null;
    /** 需要转存的文件 */
    file_ids?: {
      file_id: string;
    }[];
    /** 转存到网盘指定的文件夹 id */
    target_file_id?: string;
  }) {
    await this.ensure_initialized();
    const { url, code, file_ids, target_file_id = this.root_folder?.id } = options;
    const r1 = await this.fetch_share_profile(url, { code });
    if (r1.error) {
      this.emit(Events.TransferFailed, r1.error);
      return Result.Err(r1.error);
    }
    if (this.share_token === null) {
      const error = new Error("Please invoke fetch_share_profile first");
      this.emit(Events.TransferFailed, error);
      return Result.Err(error);
    }
    const { share_id, share_title, share_name, files } = r1.data;
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["获取分享资源详情成功，共有", String(files.length), "个文件"].map((text) => {
          return new ArticleTextNode({ text });
        }),
      })
    );
    const share_files = file_ids || files;
    // console.log("save_multiple_shared_files", share_files);
    const body = {
      requests: share_files.map((file, i) => {
        const { file_id } = file;
        return {
          body: {
            auto_rename: true,
            file_id,
            share_id,
            to_parent_file_id: target_file_id,
            to_drive_id: String(this.unique_id),
          },
          headers: {
            "Content-Type": "application/json",
          },
          id: String(i),
          method: "POST",
          url: "/file/copy",
        };
      }),
      resource: "file",
    };
    const r2 = await this.request.post<{
      responses: {
        body: {
          code: string;
          message: string;
          async_task_id?: string;
          file_id: string;
          domain_id: string;
        };
        // 其实是 index
        id: string;
        status: number;
      }[];
    }>(API_HOST + "/adrive/v2/batch", body, {
      "x-share-token": this.share_token[share_id].token,
    });
    if (r2.error) {
      this.emit(Events.TransferFailed, r2.error);
      return Result.Err(r2.error);
    }
    const responses = r2.data.responses.map((resp) => {
      // console.log("1", resp);
      const { id, status, body } = resp;
      return {
        id,
        index: Number(id) + 1,
        status,
        body,
      };
    });
    // 可能容量已经超出，这时不会尝试创建转存任务，直接返回失败
    const error_body = responses.find((resp) => {
      return ![200, 201, 202].includes(resp.status);
    });
    if (error_body) {
      const err = new Error(`存在转存失败的记录，第 ${error_body.index} 个，因为 ${JSON.stringify(error_body)}`);
      this.emit(Events.TransferFailed, err);
      return Result.Err(err);
    }
    const async_task_list = responses
      .map((resp) => {
        return resp.body.async_task_id;
      })
      .filter((id) => {
        if (!id) {
          return false;
        }
        return true;
      }) as string[];
    // console.log("async task list", async_task_list);
    if (async_task_list.length !== 0) {
      await sleep(1000);
      this.emit(Events.Print, Article.build_line(["获取转存任务状态"]));
      const r = await run(
        async () => {
          await sleep(3000);
          const r2 = await this.fetch_multiple_async_task({ async_task_ids: async_task_list });
          if (r2.error) {
            // const err = new Error("转存状态未知，可尝试重新转存");
            return {
              error: r2.error,
              finished: false,
              data: null,
            };
          }
          const { responses } = r2.data;
          this.emit(
            Events.Print,
            new ArticleSectionNode({
              children: [
                new ArticleLineNode({
                  children: [dayjs().format("HH:mm")].map((text) => new ArticleTextNode({ text })),
                }),
              ].concat(
                responses.map((resp) => {
                  const { body, id } = resp;
                  return new ArticleLineNode({
                    children: [id, body.status].map((text) => new ArticleTextNode({ text })),
                  });
                })
              ),
            })
          );
          const finished = responses.every((resp) => {
            return ["PartialSucceed", "Succeed"].includes(resp.body.status);
          });
          if (finished) {
            return {
              finished: true,
              error: null,
              data: null,
            };
          }
          return {
            finished: false,
            error: null,
            data: null,
          };
        },
        {
          timeout: 10 * 60 * 1000,
        }
      );
      if (r.error) {
        this.emit(Events.TransferFailed, r.error);
        return Result.Err(r.error);
      }
      // if (error_body) {
      //   const err = new Error(
      //     `${(() => {
      //       if (error_body.index) {
      //         return `第 ${error_body.index} 个文件转存失败`;
      //       }
      //       return "转存文件失败";
      //     })()}，因为 ${error_body.body.message}`
      //   );
      //   this.emit(Events.TransferFailed, err);
      //   return Result.Err(err);
      // }
    }
    this.emit(Events.Print, Article.build_line(["转存成功"]));
    this.emit(Events.TransferFinish);
    // console.log("save_multiple_shared_files", responses);
    return Result.Ok({
      share_id,
      share_title,
      share_name,
    });
  }
  /** 获取多个异步任务状态 */
  async fetch_multiple_async_task(args: { async_task_ids: string[] }) {
    const { async_task_ids } = args;
    const body = {
      requests: async_task_ids.map((id) => {
        return {
          body: {
            async_task_id: id,
          },
          headers: {
            "Content-Type": "application/json",
          },
          id,
          method: "POST",
          url: "/async_task/get",
        };
      }),
      resource: "file",
    };
    const r2 = await this.request.post<{
      responses: {
        body: {
          code: string;
          message: string;
          total_process: number;
          state: "Running" | "PartialSucceed" | "Succeed";
          async_task_id: string;
          consumed_process: number;
          status: "Running" | "PartialSucceed" | "Succeed";
        };
        id: string;
        status: number;
      }[];
    }>(API_HOST + "/adrive/v2/batch", body, {
      // "x-share-token": this.share_token[share_id].token,
    });
    if (r2.error) {
      return Result.Err(r2.error);
    }
    const { responses } = r2.data;
    return Result.Ok({
      responses: responses.map((resp) => {
        const { id, status, body } = resp;
        return {
          id,
          index: (() => {
            const n = Number(id);
            if (Number.isNaN(n)) {
              return null;
            }
            return n + 1;
          })(),
          status,
          body,
        };
      }),
    });
  }
  /** 分享文件 */
  async create_shared_resource(file_ids: string[]) {
    await this.ensure_initialized();
    const body = {
      expiration: dayjs().add(1, "day").toISOString(),
      sync_to_homepage: false,
      share_pwd: "",
      drive_id: String(this.unique_id),
      file_id_list: file_ids,
    };
    // console.log("[DOMAIN]AliyunDrive - create_shared_resource", body);
    const r = await this.request.post<{
      share_url: string;
      file_id: string;
      display_name: string;
      file_id_list: string[];
    }>(API_HOST + "/adrive/v2/share_link/create", body);
    if (r.error) {
      // console.log("[DOMAIN]AliyunDrive - create_shared_resource failed", r.error.message);
      return Result.Err(r.error);
    }
    const { share_url, file_id, display_name } = r.data;
    return Result.Ok({
      share_url,
      file_id,
      file_name: display_name,
    });
  }
  /**
   * 创建快传分享资源
   */
  async create_quick_shared_resource(file_ids: string[]) {
    await this.ensure_initialized();
    const r = await this.request.post<{
      share_url: string;
      file_id: string;
      display_name: string;
    }>(API_HOST + "/adrive/v1/share/create", {
      drive_file_list: file_ids.map((id) => {
        return {
          file_id: id,
          drive_id: String(this.unique_id),
        };
      }),
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    return Result.Ok({
      share_url: r.data.share_url,
      file_id: r.data.file_id,
      file_name: r.data.display_name,
    });
  }
  /** 将云盘内的文件，移动到另一个阿里云盘 */
  async move_files_to_drive(body: {
    file_ids: string[];
    target_drive_client: AliyunDriveClient;
    target_folder_id?: string;
  }) {
    const { file_ids, target_drive_client: other_drive, target_folder_id } = body;
    // console.log("[DOMAIN]move_files_to_drive - file_ids is", file_ids);
    const r = await this.create_shared_resource(file_ids);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { share_url, file_id, file_name } = r.data;
    await sleep(file_ids.length * 500);
    const r2 = await other_drive.save_multiple_shared_files({
      url: share_url,
      target_file_id: target_folder_id || other_drive.root_folder?.id || undefined,
    });
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    return Result.Ok({ file_id, file_name });
  }
  /**
   * 上传文件到云盘前，先调用该方法获取到上传地址
   */
  async create_with_folder(
    body: {
      name: string;
      parent_file_id: string;
      part_info_list: { part_number: number }[];
      size: number;
      content_hash?: string;
      proof_code?: string;
      pre_hash?: string;
      create_scene?: string;
      content_hash_name?: "sha1";
      proof_version?: "v1";
    },
    override?: { drive_id: string }
  ) {
    await this.ensure_initialized();
    const url = "/adrive/v2/file/createWithFolders";
    const b = {
      ...body,
      check_name_mode: "auto_rename",
      type: "file",
      device_name: "",
      drive_id: override ? override.drive_id : String(this.unique_id),
    };
    const r = await this.request.post<{
      parent_file_id: string;
      part_info_list: {
        part_number: number;
        // 用该地址上传
        upload_url: string;
        internal_upload_url: string;
        content_type: string;
      }[];
      upload_id: string;
      rapid_upload: boolean;
      type: string;
      file_id: string;
      revision_id: string;
      domain_id: string;
      drive_id: string;
      file_name: string;
      encrypt_mode: string;
      location: string;
      code?: string;
    }>(API_HOST + url, b);
    if (r.error) {
      // 不要 Result.Err(r.err.message)
      return r;
    }
    return Result.Ok(r.data);
  }
  /**
   * 上传一个文件到指定文件夹
   */
  async upload(
    filepath: string,
    options: { name: string; parent_file_id: string; drive_id?: string; on_progress?: (v: string) => void }
  ) {
    const { name, parent_file_id = DEFAULT_ROOT_FOLDER_ID, drive_id, on_progress } = options;
    await this.ensure_initialized();
    const token = this.access_token;
    const existing_res = await this.existing(parent_file_id, name);
    if (existing_res.error) {
      return Result.Err(existing_res.error.message);
    }
    if (existing_res.data) {
      return Result.Err("文件已存在");
    }
    // 10 MB  10485760
    let UPLOAD_CHUNK_SIZE = 10 * 1024 * 1024;
    const r2 = await file_info(filepath);
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    const { size: file_size } = r2.data;
    const r = await (async () => {
      if (file_size > 1024) {
        const c = await read_part_file(filepath, 1024);
        if (c.error) {
          return Result.Err(c.error.message);
        }
        const a = crypto.createHash("sha1");
        const pre_hash = a.update(c.data).digest("hex");
        // this.debug && console.log("pre_hash", pre_hash);
        const r = await this.create_with_folder(
          {
            part_info_list: get_part_info_list(file_size, UPLOAD_CHUNK_SIZE).slice(0, 20),
            size: file_size,
            name,
            parent_file_id,
            pre_hash,
            create_scene: "",
          },
          { drive_id: drive_id || String(this.unique_id) }
        );
        if (r.code === "PreHashMatched") {
          // console.log("before token is", token);
          const r1 = await prepare_upload_file(filepath, {
            token,
            size: r2.data.size,
          });
          if (r1.error) {
            return Result.Err(r1.error.message);
          }
          const { content_hash, proof_code, size, part_info_list } = r1.data;
          // console.log(content_hash, proof_code, r2.data.size);
          return this.create_with_folder(
            {
              content_hash,
              proof_code,
              part_info_list,
              size,
              name,
              parent_file_id,
              content_hash_name: "sha1",
              create_scene: "file_upload",
              proof_version: "v1",
            },
            { drive_id: drive_id || String(this.unique_id) }
          );
        }
        if (r.error) {
          console.log("r.error", r);
          return Result.Err(r.error.message);
        }
        return r;
      }
      const r1 = await prepare_upload_file(filepath, {
        token,
        size: r2.data.size,
      });
      if (r1.error) {
        return Result.Err(r1.error.message);
      }
      const { content_hash, proof_code, size, part_info_list } = r1.data;
      return this.create_with_folder(
        {
          content_hash,
          proof_code,
          part_info_list,
          size,
          name,
          parent_file_id,
          content_hash_name: "sha1",
          create_scene: "file_upload",
          proof_version: "v1",
        },
        { drive_id: drive_id || String(this.unique_id) }
      );
    })();
    if (r.error) {
      return Result.Err(r.error);
    }
    const chunk_count = Math.ceil(file_size / UPLOAD_CHUNK_SIZE);
    const { upload_id, file_id, file_name } = r.data;
    if (r.data.rapid_upload) {
      // 秒传，即官方已经有该文件，无需上传
      return Result.Ok({
        file_id,
        file_name,
      });
    }
    if (!r.data.part_info_list?.[0]) {
      // 秒传，即官方已经有该文件，无需上传
      return Result.Ok({
        file_id,
        file_name,
      });
    }
    let part_list = r.data.part_info_list;
    let last_part = part_list[part_list.length - 1];
    let i = 0;
    this.debug && console.log("start upload");
    const stream = fs.createReadStream(filepath, { highWaterMark: UPLOAD_CHUNK_SIZE });
    // return Result.Err("未知错误");
    // if (on_progress) {
    //   on_progress(`chunk ${i}/${chunk_count - 1}`);
    // }
    const r10: Result<{ file_id: string; file_name: string }> = await new Promise(async (resolve1) => {
      stream.on("data", async (chunk) => {
        stream.pause();
        const cur_part_number = part_list[i].part_number;
        const r: Result<void> = await new Promise(async (resolve) => {
          try {
            const upload_url = part_list[i].upload_url;
            this.debug && console.log(`chunk ${cur_part_number}/${chunk_count - 1}`);
            const rr = await axios.put(upload_url, chunk, {
              headers: {
                authority: "cn-beijing-data.aliyundrive.net",
                accept: "*/*",
                "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
                "content-type": "",
                origin: "https://www.aliyundrive.com",
                referer: "https://www.aliyundrive.com/",
                "sec-ch-ua": '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"macOS"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site",
                "user-agent":
                  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
              },
            });
            this.debug && console.log(rr.data);
            resolve(Result.Ok(null));
          } catch (err) {
            const error = err as AxiosError<{ code: string; message: string }>;
            const { response, message } = error;
            console.log("[]upload failed", message, response?.data);
            resolve(Result.Err(message || response?.data.message || "unknown", response?.data?.code, 1563));
          }
        });
        if (r.error) {
          this.debug && console.log("upload failed, because ", r.error.message);
          return resolve1(Result.Err(r.error.message));
        }
        i += 1;
        if (cur_part_number >= chunk_count - 1) {
          const r2 = await this.fetch_uploaded_file({
            upload_id,
            file_id,
          });
          if (r2.error) {
            this.debug && console.log("upload complete, but fetch result failed, because ", r2.error.message);
            return Result.Err(r2.error.message, 1562);
          }
          this.debug && console.log("fetch result and return");
          return resolve1(
            Result.Ok({
              file_id: r2.data.file_id,
              file_name: r2.data.name,
            })
          );
        }
        if (cur_part_number >= last_part.part_number) {
          this.debug && console.log("fetch next part list");
          const r2 = await this.fetch_upload_url({
            upload_id,
            file_id,
            part_info_list: Array.from({ length: 20 }, (_, index) => last_part.part_number + index + 1).map((p) => {
              return {
                part_number: p,
              };
            }),
          });
          if (r2.error) {
            this.debug && console.log("fetch next upload failed, because ", r2.error.message);
            return Result.Err(r2.error.message, 1561);
          }
          // console.log(r2.data.part_info_list.map((p) => p.part_number));
          part_list = r2.data.part_info_list;
          last_part = part_list[part_list.length - 1];
          i = 0;
        }
        stream.resume();
      });
      stream.on("end", () => {
        resolve1(Result.Err("文件读取完毕"));
      });
      stream.on("error", (err) => {
        resolve1(Result.Err(err.message));
      });
    });
    return r10;
  }
  async fetch_upload_url(body: {
    upload_id: string;
    part_info_list: {
      part_number: number;
    }[];
    file_id: string;
  }) {
    const url = "/v2/file/get_upload_url";
    await this.ensure_initialized();
    const r = await this.request.post<{
      domain_id: string;
      drive_id: string;
      file_id: string;
      part_info_list: {
        part_number: number;
        upload_url: string;
        internal_upload_url: string;
        content_type: string;
        signature_info: {
          auth_type: string;
        };
        upload_form_info: null;
        internal_upload_form_info: null;
      }[];
      upload_id: string;
      create_at: string;
    }>(API_HOST + url, {
      ...body,
      drive_id: String(this.unique_id),
    });
    if (r.error) {
      return r;
    }
    return Result.Ok(r.data);
  }
  async fetch_uploaded_file(body: { upload_id: string; file_id: string }) {
    const url = "/v2/file/complete";
    await this.ensure_initialized();
    const r = await this.request.post<{
      drive_id: string;
      domain_id: string;
      file_id: string;
      name: string;
      type: string;
      content_type: string;
      created_at: string;
      updated_at: string;
      file_extension: string;
      hidden: boolean;
      size: number;
      starred: boolean;
      status: string;
      user_meta: string;
      upload_id: string;
      parent_file_id: string;
      crc64_hash: string;
      content_hash: string;
      content_hash_name: string;
      category: string;
      encrypt_mode: string;
      video_media_metadata: {
        video_media_video_stream: unknown[];
        video_media_audio_stream: unknown[];
      };
      meta_name_punish_flag: number;
      meta_name_investigation_status: number;
      creator_type: string;
      creator_id: string;
      last_modifier_type: string;
      last_modifier_id: string;
      user_tags: {
        channel: string;
        client: string;
        device_id: string;
        device_name: string;
        version: string;
      };
      revision_id: string;
      revision_version: number;
      location: string;
      content_uri: string;
    }>(API_HOST + url, {
      ...body,
      drive_id: String(this.unique_id),
    });
    if (r.error) {
      return r;
    }
    return Result.Ok(r.data);
  }
  /** 下载指定文件 */
  async download(file_id: string) {
    await this.ensure_initialized();
    return this.fetch_file_download_url(file_id);
  }
  /**
   * 移动文件夹到资源盘
   * 如果文件夹内的文件，存在 md5 相同的文件，只会保留一个
   */
  async move_file_to_resource_drive(values: { file_ids: string[]; parent_id?: string }) {
    const { file_ids, parent_id } = values;
    await this.ensure_initialized();
    if (!this.resource_drive_id) {
      return Result.Err("请先初始化资源盘信息");
    }
    const resource_client_res = await AliyunDriveClient.Get({
      unique_id: this.resource_drive_id,
      store: this.store,
    });
    if (resource_client_res.error) {
      return Result.Err(resource_client_res.error.message);
    }
    const resource_client = resource_client_res.data;
    if (!resource_client.root_folder) {
      return Result.Err("请先设置资源索引根目录");
    }
    const url = "/adrive/v2/file/crossDriveCopy";
    const r = await this.request.post<{
      items: {
        drive_id: string;
        file_id: string;
        source_drive_id: string;
        source_file_id: string;
        status: number;
        async_task_id: string;
      }[];
    }>(API_HOST + url, {
      from_drive_id: String(this.unique_id),
      from_file_ids: file_ids,
      to_parent_fileId: parent_id || resource_client.root_folder?.id,
      to_drive_id: this.resource_drive_id,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    // console.log("[DOMAIN]aliyundriv/index - before v2/batch", r.data.items);
    const r2 = await this.request.post<{
      responses: {
        body: {
          code: string;
          message: string;
          async_task_id?: string;
          file_id: string;
          domain_id: string;
        };
        // 其实是 index
        id: string;
        status: number;
      }[];
    }>(API_HOST + "/adrive/v2/batch", {
      requests: r.data.items
        .filter((task) => {
          return !!task.async_task_id;
        })
        .map((task) => {
          const { async_task_id } = task;
          return {
            id: async_task_id,
            method: "POST",
            url: "/async_task/get",
            headers: {
              "Content-Type": "application/json",
            },
            body: {
              async_task_id,
            },
          };
        }),
      resource: "file",
    });
    if (r2.error) {
      this.emit(Events.TransferFailed, r2.error);
      return Result.Err(r2.error);
    }
    const responses = r2.data.responses.map((resp) => {
      // console.log("1", resp);
      const { id, status, body } = resp;
      return {
        id,
        index: Number(id) + 1,
        status,
        body,
      };
    });
    const async_task_list = responses
      .map((resp) => {
        return resp.body.async_task_id;
      })
      .filter((id) => {
        if (!id) {
          return false;
        }
        return true;
      }) as string[];
    if (async_task_list.length !== 0) {
      await sleep(1000);
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: ["获取任务状态"].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      const r = await run(
        async () => {
          await sleep(3000);
          const r2 = await this.fetch_multiple_async_task({ async_task_ids: async_task_list });
          if (r2.error) {
            // const err = new Error("转存状态未知，可尝试重新转存");
            return {
              error: r2.error,
              finished: false,
              data: null,
            };
          }
          const { responses } = r2.data;
          this.emit(
            Events.Print,
            new ArticleSectionNode({
              children: [
                new ArticleLineNode({
                  children: [dayjs().format("HH:mm")].map((text) => new ArticleTextNode({ text })),
                }),
              ].concat(
                responses.map((resp) => {
                  const { body, id } = resp;
                  return new ArticleLineNode({
                    children: [id, body.status].map((text) => new ArticleTextNode({ text })),
                  });
                })
              ),
            })
          );
          const finished = responses.every((resp) => {
            return ["PartialSucceed", "Succeed"].includes(resp.body.status);
          });
          if (finished) {
            return {
              finished: true,
              error: null,
              data: null,
            };
          }
          return {
            finished: false,
            error: null,
            data: null,
          };
        },
        {
          timeout: 10 * 60 * 1000,
        }
      );
      if (r.error) {
        return Result.Err(r.error);
      }
    }
    return Result.Ok(null);
  }
  async fetch_content(file_id: string) {
    const r = await this.download(file_id);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const url = r.data.url;
    try {
      // console.log("before fetch file content of", url);
      const resp = await axios.get(url);
      return Result.Ok({ content: resp.data });
    } catch (err) {
      const { response, message, code } = err as AxiosError;
      // console.log("fetch file content failed, because", message);
      return Result.Err(String(code));
    }
  }
  async ping() {
    // await this.ensure_initialized();
    const r = await this.request.post<{
      avatar: string;
      email: string;
      phone: string;
      role: string;
      status: string;
      description: string;
      punishments: null;
      creator: string;
      backup_drive_id: string;
      resource_drive_id: string;
      user_id: string;
      domain_id: string;
      user_name: string;
      nick_name: string;
      default_drive_id: string;
      sbox_drive_id: null;
      created_at: number;
      updated_at: number;
      user_data: {};
      punish_flag: null;
      default_location: string;
      deny_change_password_by_self: boolean;
      expire_at: null;
      last_login_time: number;
      need_change_password_next_login: boolean;
      phone_region: string;
      vip_identity: string;
      creator_level: null;
    }>(USER_API_HOST + "/v2/user/get", {});
    if (r.error) {
      return Result.Err(r.error);
    }
    if (!this.resource_drive_id) {
      await this.update_profile({
        resource_drive_id: r.data.resource_drive_id,
      });
      this.resource_drive_id = r.data.resource_drive_id;
    }
    return Result.Ok(r.data);
  }
  /** 文件移入回收站 */
  async to_trash(file_id: string) {
    await this.ensure_initialized();
    const r = await this.request.post(API_HOST + "/adrive/v2/recyclebin/trash", {
      drive_id: String(this.unique_id),
      file_id,
    });
    if (r.error) {
      return r;
    }
    return Result.Ok(null);
  }
  async fetch_files_in_recycle_bin(body: { next_marker?: string } = {}) {
    const { next_marker } = body;
    await this.ensure_initialized();
    const r = await this.request.post(API_HOST + "/adrive/v2/recyclebin/list", {
      drive_id: String(this.unique_id),
      limit: 20,
      order_by: "name",
      order_direction: "DESC",
    });
    if (r.error) {
      return r;
    }
    return Result.Ok(r.data);
  }
  /** 删除文件/不管在不在回收站，直接删除 */
  async delete_file(file_id: string) {
    await this.ensure_initialized();
    const r = await this.request.post(API_HOST + "/v3/file/delete", {
      drive_id: String(this.unique_id),
      file_id,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    return Result.Ok(null);
  }
  /**
   * 请求接口时返回了 401，并且还有 refresh_token 时，拿 refresh_token 换 access_token
   * @param token 用来获取新 token 的 refresh_token
   */
  async refresh_aliyun_access_token() {
    // console.log("refresh_aliyun_access_token", this.refresh_token);
    const r = await this.request.post<{
      access_token: string;
      refresh_token: string;
    }>(API_HOST + "/v2/account/token", {
      refresh_token: this.refresh_token,
      grant_type: "refresh_token",
    });
    if (r.error) {
      // console.log("refresh token failed, because", r.error.message);
      return Result.Err(r.error);
    }
    const { access_token, refresh_token } = r.data;
    // console.log("before refresh access_token", access_token.slice(-10));
    this.access_token = access_token;
    const patch_aliyun_drive_token_res = await this.patch_aliyun_drive_token({
      refresh_token,
      access_token,
      expired_at: dayjs().add(5, "minute").unix(),
    });
    if (patch_aliyun_drive_token_res.error) {
      return Result.Err(patch_aliyun_drive_token_res.error);
    }
    return Result.Ok(r.data);
  }
  async create_session() {
    const resp = await this.request.post(API_HOST + "/users/v1/users/device/create_session", {
      utdid: "Y9UzJWvkWRkDAFX691aWX0xS",
      umid: "MNkB2ehLPC8x0xKGZDDP5BZa6pHglCk5",
      deviceName: "iPhone",
      modelName: "iPhone12,3",
      pubKey: PUBLIC_KEY,
      refreshToken: this.refresh_token,
    });
    if (resp.error) {
      console.log("create_session failed, because", resp.error.message);
      return resp;
    }
    return resp;
  }
  async renew_session() {
    const { error, data } = await this.request.post<DriveRecord>(API_HOST + "/users/v1/users/device/renew_session", {});
    if (error) {
      // console.log("[]renew_session failed", error.message);
      return Result.Err(error);
    }
    // console.log("[]renew_session", data);
    return Result.Ok(data);
  }
  async patch_aliyun_drive_token(data: AliyunDriveToken) {
    if (!this.token_id) {
      return Result.Err("请先调用 client.init 方法获取云盘信息");
    }
    const { refresh_token, access_token, expired_at } = data;
    const drive = await this.store.prisma.drive.findFirst({
      where: {
        id: this.id,
      },
      include: {
        drive_token: true,
      },
    });
    if (!drive) {
      return Result.Err("没有匹配的记录");
    }
    await this.store.prisma.drive_token.update({
      where: {
        id: drive.drive_token_id,
      },
      data: {
        updated: dayjs().toISOString(),
        data: JSON.stringify({
          refresh_token,
          access_token,
        }),
        expired_at,
      },
    });
    return Result.Ok(null);
  }
  async update_profile(values: Partial<AliyunDriveProfile>) {
    const drive = await this.store.prisma.drive.findFirst({
      where: {
        id: this.id,
      },
    });
    if (!drive) {
      return Result.Err("没有匹配的云盘");
    }
    const { profile: p } = drive;
    const r2 = parseJSONStr<AliyunDriveProfile>(p);
    if (r2.error) {
      return Result.Err(r2.error);
    }
    const prev_profile = r2.data;
    const next_profile = {
      ...prev_profile,
      ...values,
    };
    await this.store.prisma.drive.update({
      where: {
        id: this.id,
      },
      data: {
        profile: JSON.stringify(next_profile),
        updated: dayjs().toISOString(),
      },
    });
    return Result.Ok(next_profile);
  }
  async fetch_vip_info() {
    const e = await this.ensure_initialized();
    if (e.error) {
      return Result.Err(e.error.message);
    }
    const url = "/business/v1.0/users/vip/info";
    const r = await this.request.post<{
      identity: string;
      level: null;
      icon: string;
      mediumIcon: string;
      status: string;
      autoRenew: boolean;
      vipCode: string;
      vipList: {
        name: string;
        code: string;
        promotedAt: number;
        expire: number;
      }[];
    }>(API_HOST + url, {});
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { identity, vipList } = r.data;
    return Result.Ok({
      identity,
      list: vipList.map((vip) => {
        const { name, expire, promotedAt } = vip;
        return {
          name,
          expired_at: expire,
          started_at: promotedAt,
        };
      }),
    });
  }
  /** 系统文件夹/系统盘 */
  async fetch_system_folders() {
    await this.ensure_initialized();
    const url = "/adrive/v1/file/getTopFolders";
    return this.request.post<{
      items: {
        order: number;
        // 相册、密码箱
        type: "album" | "sbox";
        driveId: string;
        url: string;
        redirectUrl: string;
        id: string;
        needPassword: boolean;
        thumbnail: string;
        name: string;
      }[];
    }>(API_V2_HOST + url, {});
  }
  /** 获取相册盘基本信息 */
  async fetch_album_summary() {
    await this.ensure_initialized();
    // 获取相册盘 id
    // https://api.aliyundrive.com/adrive/v1/user/albums_info
    // driveId : "229110670" driveName : "alibum"
    const r1 = await this.fetch_system_folders();
    if (r1.error) {
      return Result.Err(r1.error.message);
    }
    const album_drive = r1.data.items.find((folder) => {
      return folder.type === "album";
    });
    if (!album_drive) {
      return Result.Err("没有找到相册文件夹");
    }
    const album_drive_id = album_drive.driveId;
    const url = "/adrive/v1/albumHome/summary";
    const r = await this.request.post<{
      photos: {
        order: number;
        items: {
          name: string;
          type: string;
          total_count: number;
          file_list: {
            name: string;
            thumbnail: string;
            type: string;
            category: string;
            hidden: boolean;
            status: string;
            url: string;
            size: number;
            starred: boolean;
            user_tags: {
              channel: string;
              client: string;
              device_id: string;
              device_name: string;
              version: string;
            };
            mime_type: string;
            parent_file_id: string;
            drive_id: string;
            file_id: string;
            file_extension: string;
            revision_id: string;
            content_hash: string;
            content_hash_name: string;
            encrypt_mode: string;
            domain_id: string;
            download_url: string;
            user_meta: string;
            content_type: string;
            created_at: string;
            updated_at: string;
            trashed_at: null;
            punish_flag: number;
            image_media_metadata: {
              faces: string;
              height: number;
              image_quality: {
                overall_score: number;
              };
              width: number;
              exif: string;
            };
          }[];
          album_id: string;
        }[];
      };
      faces: {
        order: number;
        items: unknown[];
      };
      locations: {
        order: number;
        items: unknown[];
      };
      memories: {
        order: number;
        items: unknown[];
      };
      tags: {
        order: number;
        items: unknown[];
      };
      highlights: {
        order: number;
        items: unknown[];
      };
      more: {
        order: number;
        items: {
          type: string;
          total_count: number;
        }[];
      };
      sharedAlbum: {
        order: number;
        driveId: string;
        usedSize: number;
        totalSize: number;
        totalCount: number;
        createdCount: number;
        joinedCount: number;
        showRedDot: boolean;
        items: unknown[];
      };
      aiAlbum: {};
      quick_access: {
        order: number;
        items: {
          type: string;
          name: string;
          total_count: number;
        }[];
      };
    }>(API_V2_HOST + url, {
      album_drive_id,
      drive_id: String(this.unique_id),
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    return Result.Ok(r.data);
  }
  async fetch_images_in_folders() {
    await this.ensure_initialized();
    const url = "/adrive/v1/sfiia/list_folder";
    const r = await this.request.post<{
      items: {
        path: {
          name: string;
          drive_id: string;
          file_id: string;
        }[];
        drive_id: string;
        file_id: string;
        created_at: string;
        domain_id: string;
        encrypt_mode: string;
        hidden: boolean;
        name: string;
        parent_file_id: string;
        starred: boolean;
        status: string;
        type: string;
        updated_at: string;
        sync_flag: boolean;
        image_count: number;
        latest_images: {
          drive_id: string;
          file_id: string;
          category: string;
          content_hash: string;
          content_hash_name: string;
          content_type: string;
          crc64_hash: string;
          created_at: string;
          domain_id: string;
          download_url: string;
          encrypt_mode: string;
          file_extension: string;
          hidden: boolean;
          image_media_metadata: {
            exif: string;
            height: number;
            image_quality: {
              overall_score: number;
            };
            image_tags: {
              confidence: number;
              name: string;
              parent_name: string;
              tag_level: number;
            }[];
            width: number;
          };
          labels: string[];
          mime_type: string;
          name: string;
          parent_file_id: string;
          punish_flag: number;
          size: number;
          starred: boolean;
          status: string;
          thumbnail: string;
          type: string;
          updated_at: string;
          url: string;
          sync_flag: boolean;
        }[];
      }[];
      next_marker: string;
    }>(API_V2_HOST + url, {
      limit: 15,
      drive_id_list: [String(this.unique_id)],
      hidden: false,
      order_direction: "DESC",
      order_by: "created_at",
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    return Result.Ok({
      items: r.data.items
        .map((folder) => {
          return folder.latest_images;
        })
        .reduce((total, cur) => {
          return total.concat(cur);
        }, []),
      next_marker: r.data.next_marker,
    });
  }
  /** 不知道干嘛 */
  async fetch_drives() {
    await this.ensure_initialized();
    const url = "/v2/drive/list_my_drives";
    return this.request.post(API_V2_HOST + url, {
      limit: 100,
    });
  }
  /** 获取相册列表 */
  async fetch_album_list() {
    await this.ensure_initialized();
    const r = await this.fetch_album_summary();
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const {
      photos: { items },
    } = r.data;
    const result = items
      .filter((album) => {
        const { type } = album;
        if (type === "manual") {
          return true;
        }
        return false;
      })
      .map((album) => {
        const { name, type, total_count, album_id } = album;
        return {
          name,
          type,
          total_count,
          album_id,
        };
      });
    return Result.Ok(result);
  }
  /** 获取相册盘内文件列表 */
  async fetch_album_file_list() {
    await this.ensure_initialized();
    const r = await this.fetch_album_summary();
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const {
      photos: { items },
    } = r.data;
    const result = items.find((album) => {
      const { type } = album;
      if (type === "default") {
        return true;
      }
      return false;
    });
    if (!result) {
      return Result.Err("异常2");
    }
    return Result.Ok(result.file_list);
  }
  /** 获取相册盘 */
  async fetch_album_drive() {
    const r1 = await this.fetch_system_folders();
    if (r1.error) {
      return Result.Err(r1.error.message);
    }
    const album_drive = r1.data.items.find((folder) => {
      return folder.type === "album";
    });
    if (!album_drive) {
      return Result.Err("没有找到相册盘");
    }
    const album_drive_id = album_drive.driveId;
    return Result.Ok({
      drive_id: album_drive_id,
    });
  }
  /** 创建一个相册 */
  async create_album(values: { name: string }) {
    const { name } = values;
    await this.ensure_initialized();
    const url = "/adrive/v1/album/create";
    return this.request.post<{
      owner: string;
      name: string;
      description: string;
      album_id: string;
      file_count: number;
      image_count: number;
      video_count: number;
      created_at: number;
      updated_at: number;
    }>(API_V2_HOST + url, {
      name,
    });
  }
  /** 删除指定相册 */
  async delete_album(values: { album_id: string }) {
    const { album_id } = values;
    await this.ensure_initialized();
    const url = "/adrive/v1/album/delete";
    return this.request.post<{}>(API_V2_HOST + url, {
      album_id,
    });
  }
  async upload_files_to_album() {}
  /** 根据名称查找相册 */
  async find_album(name: string, parent_file_id: string = DEFAULT_ROOT_FOLDER_ID) {
    const album_list_res = await this.fetch_album_list();
    if (album_list_res.error) {
      return Result.Err(album_list_res);
    }
    const matched = album_list_res.data.find((album) => {
      return album.name === name;
    });
    if (!matched) {
      return Result.Err("没有匹配的记录");
    }
    return Result.Ok(matched);
  }
  /**
   * 选择云盘内文件到相册
   */
  async save_files_to_album(values: { file_id: string; drive_id: string; album_id: string }) {
    const { file_id, album_id, drive_id } = values;
    await this.ensure_initialized();
    const url = "/adrive/v1/album/add_files";
    const body = {
      drive_file_list: [
        {
          filedsMeta__: {
            1: {
              fieldId: 1,
              clazz: "NSString",
              name: "drive_id",
              typeEnum: 0,
            },
            2: {
              fieldId: 2,
              clazz: "NSString",
              name: "drive_id",
              typeEnum: 0,
            },
          },
          drive_id,
          file_id,
        },
      ],
      album_id,
    };
    return this.request.post<{
      file_list: {
        trashed: boolean;
        drive_id: string;
        file_id: string;
        category: string;
        content_hash: string;
        content_hash_name: string;
        content_type: string;
        crc64_hash: string;
        created_at: string;
        domain_id: string;
        download_url: string;
        encrypt_mode: string;
        file_extension: string;
        hidden: boolean;
        image_media_metadata: {
          exif: string;
          height: number;
          image_quality: {
            overall_score: number;
          };
          image_tags: {
            confidence: number;
            name: string;
            parent_name: string;
            tag_level: number;
          }[];
          width: number;
        };
        labels: string[];
        mime_type: string;
        name: string;
        parent_file_id: string;
        punish_flag: number;
        size: number;
        starred: boolean;
        status: string;
        thumbnail: string;
        type: string;
        updated_at: string;
        url: string;
        sync_flag: boolean;
        ex_fields_info: {};
      }[];
    }>(API_V2_HOST + url, body);
  }
  /**
   * 获取相册详情
   */
  async fetch_album(values: { album_id: string }) {
    await this.ensure_initialized();
    const url = "/adrive/v1/album/get";
    return this.request.post<{
      owner: string;
      name: string;
      description: string;
      cover: {
        list: {
          trashed: boolean;
          drive_id: string;
          file_id: string;
          category: string;
          content_hash: string;
          content_hash_name: string;
          content_type: string;
          crc64_hash: string;
          created_at: string;
          domain_id: string;
          download_url: string;
          encrypt_mode: string;
          file_extension: string;
          hidden: boolean;
          image_media_metadata: {
            exif: string;
            faces: string;
            height: number;
            image_quality: {
              overall_score: number;
            };
            image_tags: {
              confidence: number;
              name: string;
              parent_name: string;
              tag_level: number;
            }[];
            width: number;
          };
          labels: string[];
          mime_type: string;
          name: string;
          parent_file_id: string;
          punish_flag: number;
          size: number;
          starred: boolean;
          status: string;
          thumbnail: string;
          type: string;
          updated_at: string;
          upload_id: string;
          url: string;
          user_meta: string;
          ex_fields_info: {};
        }[];
      };
      album_id: string;
      file_count: number;
      image_count: number;
      video_count: number;
      created_at: number;
      updated_at: number;
    }>(API_V2_HOST + url, values);
  }
  /** 签到 */
  async checked_in() {
    const r = await this.ensure_initialized();
    if (r.error) {
      return Result.Err(r.error);
    }
    const { error, data } = await this.request.post<{
      success: boolean;
      message: string;
      result: {
        subject: string;
      };
    }>(
      MEMBER_API_HOST + "/v1/activity/sign_in_list",
      {
        isReward: true,
      },
      {
        Host: "member.aliyundrive.com",
      }
    );
    if (error) {
      return Result.Err(error);
    }
    const { success, message } = data;
    if (!success) {
      return Result.Err(message);
    }
    return Result.Ok(null);
  }
  /** 获取签到奖励列表 */
  async fetch_rewards() {
    const r = await this.ensure_initialized();
    if (r.error) {
      return Result.Err(r.error);
    }
    const { error, data } = await this.request.post<{
      success: boolean;
      code: null;
      message: string | null;
      totalCount: null;
      nextToken: null;
      maxResults: null;
      result: {
        subject: string;
        title: string;
        description: string;
        isReward: boolean;
        blessing: string;
        signInCount: number;
        signInCover: string;
        signInRemindCover: string;
        rewardCover: string;
        pcAndWebRewardCover: string;
        signInLogs: {
          day: number;
          status: "normal" | "miss";
          icon: string;
          pcAndWebIcon: string;
          notice: null;
          /** 奖品类型 postpone(延期卡) */
          type: "luckyBottle" | "svipVideo" | "svip8t" | "logo" | "postpone";
          rewardAmount: number;
          themes: string;
          calendarChinese: string;
          calendarDay: string;
          calendarMonth: string;
          poster: null;
          reward: {
            goodsId: null;
            name: null;
            description: null;
            background: string;
            color: null;
            action: null;
            detailAction: null;
            notice: null;
            bottleId: null;
            bottleName: null;
          };
          /** 是否领取 true已领取 false未领取 */
          isReward: boolean;
        }[];
      };
      arguments: null;
    }>(
      MEMBER_API_HOST + "/v1/activity/sign_in_list",
      {
        isReward: false,
      },
      {
        Host: "member.aliyundrive.com",
      }
    );
    if (error) {
      return Result.Err(error);
    }
    const { success, message } = data;
    if (!success) {
      return Result.Err(message as string);
    }
    const {
      result: { signInLogs },
    } = data;
    return Result.Ok(
      signInLogs
        .filter((log) => {
          const { status, isReward } = log;
          return isReward === false && status === "normal";
        })
        .map((log) => {
          const { day, type, rewardAmount, isReward } = log;
          return {
            day,
            type,
            rewardAmount,
            isReward,
          };
        })
    );
  }
  /** 领取奖励 */
  async receive_reward(day: number) {
    const r = await this.ensure_initialized();
    if (r.error) {
      return Result.Err(r.error);
    }
    const { error, data } = await this.request.post<{
      success: boolean;
      code: null;
      message: string | null;
      totalCount: null;
      nextToken: null;
      maxResults: null;
      result: {
        goodsId: number;
        name: string;
        description: string;
        background: string;
        color: string;
        action: string;
        detailAction: string;
        notice: string;
        bottleId: null;
        bottleName: null;
      };
      arguments: null;
    }>(
      MEMBER_API_HOST + "/v1/activity/sign_in_reward",
      {
        signInDay: day,
      },
      {
        Host: "member.aliyundrive.com",
      }
    );
    if (error) {
      return Result.Err(error);
    }
    const { success, message } = data;
    if (!success) {
      return Result.Err(message as string);
    }
    const { result } = data;
    return Result.Ok(result);
  }
  /** 获取当天签到任务/奖励列表 */
  async fetch_rewards_v2() {
    const r = await this.ensure_initialized();
    if (r.error) {
      return Result.Err(r.error);
    }
    const { error, data } = await this.request.post<{
      success: boolean;
      code: string;
      message: string;
      totalCount: null;
      nextToken: null;
      maxResults: null;
      result: {
        isSignIn: boolean;
        month: string;
        day: string;
        signInDay: number;
        blessing: string;
        subtitle: string;
        themeIcon: string;
        theme: string;
        action: string;
        rewards: {
          name: string;
          nameIcon: string;
          type: string;
          actionText: null;
          action: null;
          status: "unfinished" | "finished";
          // 如果任务完成了就是使用说明。没完成就是任务说明
          remind: string;
          remindIcon: string;
          expire: null;
          position: number;
        }[];
      };
      arguments: null;
    }>(
      MEMBER_API_V2_HOST + "/v2/activity/sign_in_info",
      {},
      {
        Host: "member.alipan.com",
      }
    );
    if (error) {
      return Result.Err(error);
    }
    const { success, message } = data;
    if (!success) {
      return Result.Err(message as string);
    }
    const {
      result: { month, day, rewards },
    } = data;
    return Result.Ok({
      month,
      day,
      rewards,
    });
  }
  /** 领取奖励 */
  async receive_reward_v2(day: number) {
    const r = await this.ensure_initialized();
    if (r.error) {
      return Result.Err(r.error);
    }
    const { error, data } = await this.request.post<{
      success: boolean;
      code: null;
      message: string | null;
      totalCount: null;
      nextToken: null;
      maxResults: null;
      result: {
        goodsId: number;
        name: string;
        description: string;
        background: string;
        color: string;
        action: string;
        detailAction: string;
        notice: string;
        bottleId: null;
        bottleName: null;
      };
      arguments: null;
    }>(
      MEMBER_API_HOST + "/v2/activity/sign_in_task_reward",
      {
        signInDay: day,
      },
      {
        Host: "member.alipan.com",
      }
    );
    if (error) {
      return Result.Err(error);
    }
    const { success, message } = data;
    if (!success) {
      return Result.Err(message as string);
    }
    const { result } = data;
    return Result.Ok(result);
  }
  /** 福利码兑换 */
  async receive_awards_form_code(code: string) {
    await this.ensure_initialized();
    const { error, data } = await this.request.post<{
      success: boolean;
      code: null;
      message: string | null;
      totalCount: null;
      nextToken: null;
      maxResults: null;
      result: {};
      arguments: null;
    }>(
      MEMBER_API_V2_HOST + "/v1/users/rewards",
      {
        code,
      },
      {
        Host: "member.alipan.com",
      }
    );
    if (error) {
      return Result.Err(error.message);
    }
    if (!data.success) {
      return Result.Err(data.message || "领取失败");
    }
    return Result.Ok(data);
  }

  on_transfer_failed(handler: Handler<TheTypesOfEvents[Events.TransferFailed]>) {
    return this.on(Events.TransferFailed, handler);
  }
  on_transfer_finish(handler: Handler<TheTypesOfEvents[Events.TransferFinish]>) {
    return this.on(Events.TransferFinish, handler);
  }
  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
}

function format_M3U8_manifest(videos: PartialVideo[]) {
  const result: {
    name: string;
    width: number;
    height: number;
    type: MediaResolutionTypes;
    url: string;
    invalid: number;
  }[] = [];
  for (let i = 0; i < videos.length; i += 1) {
    const { url, status, template_id, template_name, template_width, template_height } = videos[i];
    if (status === "finished") {
      result.push({
        name: template_name,
        width: template_width,
        height: template_height,
        type: template_id as MediaResolutionTypes,
        url,
        invalid: url ? 0 : 1,
      });
    }
  }
  return result;
}
