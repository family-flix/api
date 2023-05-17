/**
 * @file 阿里云盘
 * @doc https://www.yuque.com/aliyundrive/zpfszx
 */
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import dayjs, { Dayjs } from "dayjs";

import { Result } from "@/types";
import { query_stringify } from "@/utils";
import { log } from "@/logger/log";
import { AliyunDriveRecord } from "@/store/types";
import { store_factory } from "@/store";

import { AliyunDriveFileResp, AliyunDriveToken, PartialVideo } from "./types";

const API_HOST = "https://api.aliyundrive.com";
const MEMBER_API_HOST = "https://member.aliyundrive.com";
const PUBLIC_KEY =
  "04d9d2319e0480c840efeeb75751b86d0db0c5b9e72c6260a1d846958adceaf9dee789cab7472741d23aafc1a9c591f72e7ee77578656e6c8588098dea1488ac2a";
const SIGNATURE =
  "f4b7bed5d8524a04051bd2da876dd79afe922b8205226d65855d02b267422adb1e0d8a816b021eaf5c36d101892180f79df655c5712b348c2a540ca136e6b22001";
const COMMENT_HEADERS = {
  authority: "api.aliyundrive.com",
  Host: "api.aliyundrive.com",
  Cookie:
    "_nk_=t-2213376065375-52; _tb_token_=5edd38eb839fa; cookie2=125d9fb93ba60bae5e04cf3a4f1844ce; csg=7be2d6ea; munb=2213376065375; t=cc514082229d35fa6e4cb77f9607a31a; isg=BPv7iSICHO8ckiBhqmD_qx8rgNtlUA9S5UNxz-241_oRTBsudSCfohmeYGIC92dK; l=Al1dbs-eO-pLLQIH1VDqMyQKbSJXe5HM; cna=XiFcHCbGiCMCAX14pqXhM/U9",
  "content-type": "application/json; charset=UTF-8",
  accept: "*/*",
  "x-umt": "xD8BoI9LPBwSmhKGWfJem6nHQ7xstNFA",
  "x-sign":
    "izK9q4002xAAJGGHrNSHxqaOJAfmJGGEYjdc0ltNpMTdx5GeaXDSRaCtwKwEG0Rt2xgVv6dPLJBixqXoMb0l07OzsyxxtGGEYbRhhG",
  "x-canary": "client=iOS,app=adrive,version=v4.1.3",
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

type RequestClient = {
  get: <T>(
    url: string,
    query?: Record<string, string | number | undefined | null>,
    extra?: Partial<AxiosRequestConfig>
  ) => Promise<Result<T>>;
  post: <T>(
    url: string,
    body?: Record<string, unknown>,
    headers?: Record<string, unknown>
  ) => Promise<Result<T>>;
};

export class AliyunDriveClient {
  drive_id: string | null = null;
  /** 访问凭证 */
  access_token: null | string = null;
  /** 刷新凭证 */
  refresh_token: null | string = null;
  /** 请求使用的签名 */
  signature: string | null = null;
  /** 阿里云盘 id */
  aliyun_drive_id: string | null = null;
  /** 设备id */
  device_id: string | null = null;
  /** 是否为登录状态 */
  is_login = false;
  /** 阿里云身份凭证 */
  token: null | AliyunDriveRecord = null;
  // user_id: string;
  expired_at: null | Dayjs = null;
  /** 请求客户端 */
  request: RequestClient;
  renew_session_timer: null | NodeJS.Timer = null;
  /** 数据库阿里云盘 id */
  db_drive_id: string;
  /** 数据库凭证 id */
  token_id: string | null = null;
  share_token: string | null = null;
  share_token_expired_at: number | null = null;
  /** 数据库表 aliyun_drive 记录 */
  profile: AliyunDriveRecord | null = null;
  /**
   * 数据库操作
   * 由于 drive 依赖 access_token、refresh_token，必须有一个外部持久存储
   */
  store: ReturnType<typeof store_factory>;

  constructor(options: {
    /** aliyun_drive 表的 id */
    drive_id: string;
    store: ReturnType<typeof store_factory>;
  }) {
    const { drive_id = "", store } = options;
    if (!store) {
      throw new Error("Missing methods fetch store");
    }
    if (!drive_id) {
      throw new Error("缺少 drive id 参数");
    }
    // this.user_id = user_id;
    this.db_drive_id = drive_id;
    this.store = store;
    const client = axios.create({
      timeout: 6000,
    });
    this.request = {
      get: async (endpoint, query, extra: Partial<AxiosRequestConfig> = {}) => {
        const url = `${endpoint}${query ? "?" + query_stringify(query) : ""}`;
        const headers = {
          ...COMMENT_HEADERS,
          authorization: this.access_token,
          "x-device-id": this.device_id,
          "x-signature": this.signature,
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
          console.error(
            "GET request failed, because",
            response?.status,
            response?.data
          );
          if (response?.status === 401) {
            await this.refresh_aliyun_access_token();
          }
          return Result.Err(response?.data?.message || message);
        }
      },
      post: async (url, body, extra_headers = {}) => {
        const headers = {
          ...COMMENT_HEADERS,
          ...extra_headers,
          authorization: this.access_token,
          "x-device-id": this.device_id,
          "x-signature": this.signature,
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
          console.error(
            "POST request failed, because",
            response?.status,
            response?.data
          );
          // console.log(response, message);
          if (response?.status === 401) {
            if (response?.data?.code === "UserDeviceOffline") {
              await this.create_session();
              return Result.Err(response?.data?.code);
            }
            if (response?.data?.code === "AccessTokenInvalid") {
              // ...
            }
            if (response?.data?.code === "DeviceSessionSignatureInvalid") {
              // ...
            }
            await this.refresh_aliyun_access_token();
          }
          return Result.Err(
            response?.data?.message || message,
            response?.data?.code
          );
        }
      },
    };
    // if (this.renew_session_timer) {
    //   return;
    // }
    // this.renew_session_timer = setInterval(() => {
    //   this.renew_session();
    // }, 1000 * 60 * 3);
  }
  /** 初始化所有信息 */
  async init() {
    this.signature = SIGNATURE;
    // console.log("[]init - drive_id", this.db_drive_id);
    const aliyun_drive_resp = await this.store.find_drive({
      id: this.db_drive_id,
    });
    if (aliyun_drive_resp.error) {
      return aliyun_drive_resp.error;
    }
    if (!aliyun_drive_resp.data) {
      return Result.Err("No matched record of drive");
    }
    const { id, device_id, drive_id } = aliyun_drive_resp.data;
    this.profile = aliyun_drive_resp.data;
    this.drive_id = id;
    this.aliyun_drive_id = drive_id;
    this.device_id = device_id;
    const aliyun_drive_token_resp = await this.store.find_aliyun_drive_token({
      drive_id: id,
    });
    if (aliyun_drive_token_resp.error) {
      return aliyun_drive_token_resp;
    }
    if (!aliyun_drive_token_resp.data) {
      return Result.Err("No matched record of aliyun_drive_token");
    }
    const {
      id: token_id,
      refresh_token,
      access_token,
      expired_at,
    } = aliyun_drive_token_resp.data;
    this.access_token = access_token;
    this.refresh_token = refresh_token;
    this.token_id = token_id;

    let token = {
      access_token: aliyun_drive_token_resp.data.access_token,
      refresh_token: aliyun_drive_token_resp.data.refresh_token,
    };
    if (!expired_at || dayjs(expired_at * 1000).isBefore(dayjs())) {
      console.log("access token is expired, refresh it");
      const refresh_token_resp = await this.refresh_aliyun_access_token();
      if (refresh_token_resp.error) {
        return refresh_token_resp;
      }
      token.access_token = refresh_token_resp.data.access_token;
      token.refresh_token = refresh_token_resp.data.refresh_token;
      const create_session_resp = await this.create_session();
      if (create_session_resp.error) {
        return create_session_resp;
      }
    }
    return Result.Ok(token);
  }
  async ensure_initialized() {
    if (!this.signature) {
      await this.init();
    }
  }
  async refresh_profile() {
    await this.ensure_initialized();
    if (this.profile === null) {
      return Result.Err("请先初始化云盘信息");
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
    // await this.store.update_aliyun_drive(this.profile.id, {
    //   total_size: drive_total_size,
    //   used_size: drive_used_size,
    // });
    this.profile.used_size = drive_used_size;
    this.profile.total_size = drive_total_size;
    return Result.Ok(this.profile);
  }
  async fetch_files(
    folder_file_id: string = "root",
    options: Partial<{
      page_size: number;
      marker: string;
    }> = {}
  ) {
    if (folder_file_id === undefined) {
      return Result.Err("Please pass folder file id");
    }
    await this.ensure_initialized();
    const { page_size = 20, marker } = options;
    const result = await this.request.post<{
      items: AliyunDriveFileResp[];
      next_marker: string;
    }>(API_HOST + "/adrive/v3/file/list", {
      all: false,
      parent_file_id: folder_file_id,
      drive_id: this.aliyun_drive_id,
      limit: page_size,
      marker,
      order_by: "name",
      order_direction: "DESC",
      image_thumbnail_process: "image/resize,w_256/format,jpeg",
      image_url_process: "image/resize,w_1920/format,jpeg/interlace,1",
      url_expire_sec: 14400,
      video_thumbnail_process: "video/snapshot,t_1000,f_jpg,ar_auto,w_256",
    });
    if (result.error) {
      return Result.Err(result.error.message);
    }
    return Result.Ok(result.data);
  }
  /**
   * 获取单个文件或文件夹详情
   */
  async fetch_file(file_id = "root") {
    if (file_id === undefined) {
      return Result.Err("Please pass folder file id");
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
      /** 缩略图 */
      thumbnail: string;
    }>(API_HOST + "/v2/file/get", {
      file_id,
      drive_id: this.aliyun_drive_id,
      image_thumbnail_process: "image/resize,w_256/format,jpeg",
      image_url_process: "image/resize,w_1920/format,jpeg/interlace,1",
      url_expire_sec: 1600,
      video_thumbnail_process: "video/snapshot,t_1000,f_jpg,ar_auto,w_256",
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    return Result.Ok(r.data);
  }
  /** 添加文件夹 */
  async add_folder(params: { parent_file_id?: string; name: string }) {
    const { parent_file_id = "root", name } = params;
    if (!name) {
      return Result.Err("缺少文件夹名称");
    }
    await this.ensure_initialized();
    const r = await this.request.post(
      API_HOST + "/adrive/v2/file/createWithFolders",
      {
        check_name_mode: "refuse",
        drive_id: this.aliyun_drive_id,
        name,
        parent_file_id,
        type: "folder",
      }
    );
    if (r.error) {
      return Result.Err(r.error);
    }
    return Result.Ok(null);
  }

  /** 获取一个文件的详细信息，包括其路径 */
  async fetch_file_profile(file_id: string) {
    await this.ensure_initialized();
    const r = await this.fetch_file(file_id);
    if (r.error) {
      return r;
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
      drive_id: this.aliyun_drive_id,
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
  async rename_file(file_id: string, next_name: string) {
    if (file_id === undefined) {
      return Result.Err("Please pass folder file id");
    }
    const result = await this.request.post<{
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
      check_name_mode: "refuse",
      drive_id: this.aliyun_drive_id,
      file_id,
      name: next_name,
    });
    return result;
  }
  async fetch_video_preview_info(file_id: string) {
    await this.ensure_initialized();
    const result = await this.request.post<{
      video_preview_play_info: {
        live_transcoding_task_list: PartialVideo[];
      };
    }>(API_HOST + "/v2/file/get_video_preview_play_info", {
      file_id,
      drive_id: this.aliyun_drive_id,
      category: "live_transcoding",
      template_id: "",
      url_expire_sec: 14400,
      get_subtitle_info: true,
    });
    if (result.error) {
      return result;
    }
    // console.log(
    //   "[]fetch_video_preview_info success",
    //   result.data.video_preview_play_info.live_transcoding_task_list
    // );
    const a = format_M3U8_manifest(
      result.data.video_preview_play_info.live_transcoding_task_list
    );
    return Result.Ok(a);
  }
  async search_files(name: string, type: "folder" = "folder") {
    await this.ensure_initialized();
    const result = await this.request.post<{
      items: AliyunDriveFileResp[];
    }>(API_HOST + "/adrive/v3/file/search", {
      drive_id: this.aliyun_drive_id,
      image_thumbnail_process: "image/resize,w_200/format,jpeg",
      image_url_process: "image/resize,w_1920/format,jpeg",
      limit: 20,
      order_by: "updated_at DESC",
      query: `name match "${name}" and type = "${type}"`,
      video_thumbnail_process: "video/snapshot,t_1000,f_jpg,ar_auto,w_300",
    });
    if (result.error) {
      return result;
    }
    return Result.Ok(result.data);
  }
  /** 获取指定视频在指定秒数下的缩略图 */
  async generate_thumbnail(values: { file_id: string; cur_time: string }) {
    const { file_id, cur_time } = values;
    await this.ensure_initialized();
    const result = await this.request.get<{ responseUrl: string }>(
      API_HOST + "/v2/file/download",
      {
        drive_id: this.aliyun_drive_id,
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

  cached_share_token: Record<string, string> = {};
  /**
   * @param url 分享链接
   */
  async prepare_fetch_shared_files(
    url: string,
    options: Partial<{ force: boolean }> = {}
  ): Promise<
    Result<{
      share_id: string;
      share_token: string;
      share_title?: string;
      share_name?: string;
    }>
  > {
    const { force = false } = options;
    const matched_share_id = url.match(/\/s\/([a-zA-Z0-9]{1,})$/);
    if (!matched_share_id) {
      return Result.Err(
        "Invalid url, it must includes share_id like 'hFgvpSXzCYd' at the end of url"
      );
    }
    const share_id = matched_share_id[1];
    if (this.share_token && force === false) {
      return Result.Ok({
        share_id,
        share_token: this.share_token,
      });
    }
    await this.ensure_initialized();
    const r1 = await this.request.post<{
      creator_id: string;
      share_name: string;
      share_title: string;
    }>(API_HOST + "/adrive/v2/share_link/get_share_by_anonymous", {
      share_id,
    });
    if (r1.error) {
      return r1;
    }
    const share_token_resp = await (async () => {
      if (
        !this.share_token ||
        !this.share_token_expired_at ||
        dayjs(this.share_token_expired_at).isBefore(dayjs())
      ) {
        const r2 = await this.request.post<{
          share_token: string;
          expire_time: string;
          expires_in: number;
        }>(API_HOST + "/v2/share_link/get_share_token", {
          share_id,
        });
        if (r2.error) {
          return Result.Err(r2.error);
        }
        const { share_token, expires_in } = r2.data;
        this.share_token_expired_at = dayjs()
          .add(expires_in, "second")
          .valueOf();
        return Result.Ok({
          share_token,
        });
      }
      return Result.Ok({
        share_token: this.share_token,
      });
    })();
    if (share_token_resp.error) {
      return share_token_resp;
    }
    const token = share_token_resp.data.share_token;
    this.share_token = token;
    return Result.Ok({
      share_token: token,
      share_id,
      share_name: r1.data.share_name,
      share_title: r1.data.share_title,
    });
  }
  async fetch_shared_files(
    file_id: string,
    options: Partial<{
      page_size: number;
      share_id: string;
      marker: string;
    }>
  ) {
    if (this.share_token === null) {
      return Result.Err("Please invoke prepare_fetch_shared_files first");
    }
    const { page_size = 20, share_id, marker } = options;
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
        "x-share-token": this.share_token,
      }
    );
    return r3;
  }
  /** 转存分享的文件 */
  async save_shared_files(options: {
    /** 分享链接 */
    url: string;
    /** 要转存的文件/文件夹 id */
    file_id: string;
    /** 转存到网盘指定的文件夹 id */
    target_file_id?: string;
  }) {
    await this.ensure_initialized();
    if (this.profile === null) {
      return Result.Err("Please invoke init first");
    }
    const {
      url,
      file_id,
      target_file_id = this.profile.root_folder_id,
    } = options;
    const r1 = await this.prepare_fetch_shared_files(url);
    // console.log("fetch shared file info", r1);
    if (r1.error) {
      return Result.Err(r1.error);
    }
    if (this.share_token === null) {
      return Result.Err("Please invoke prepare_fetch_shared_files first");
    }
    const { share_id, share_title, share_name } = r1.data;
    const r2 = await this.request.post(
      API_HOST + "/v2/file/copy",
      {
        share_id,
        file_id,
        to_parent_file_id: target_file_id,
        to_drive_id: this.aliyun_drive_id,
      },
      {
        "x-share-token": this.share_token,
      }
    );
    // console.log("save file result", r2.error, r2.data);
    if (r2.error) {
      return Result.Err(r2.error);
    }
    // const r4 = await this.store.find_async_task({ unique_id: url });
    // if (r4.error) {
    //   return Result.Err(r4.error);
    // }
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
    files: {
      /** 要转存的文件/文件夹 id */
      file_id: string;
    }[];
    /** 转存到网盘指定的文件夹 id */
    target_file_id?: string;
  }) {
    await this.ensure_initialized();
    if (this.profile === null) {
      return Result.Err("Please invoke init first");
    }
    const {
      url,
      files,
      target_file_id = this.profile.root_folder_id,
    } = options;
    const r1 = await this.prepare_fetch_shared_files(url);
    // console.log("fetch shared file info", r1);
    if (r1.error) {
      return Result.Err(r1.error);
    }
    if (this.share_token === null) {
      return Result.Err("Please invoke prepare_fetch_shared_files first");
    }
    const { share_id, share_title, share_name } = r1.data;
    const r2 = await this.request.post(
      API_HOST + "/adrive/v2/batch",
      {
        requests: files.map((file) => {
          const { file_id } = file;
          return {
            body: {
              auto_rename: true,
              file_id,
              share_id,
              to_parent_file_id: target_file_id,
              to_drive_id: this.aliyun_drive_id,
            },
            headers: {
              "Content-Type": "application/json",
            },
            id: "0",
            method: "POST",
            url: "/file/copy",
          };
        }),
        resource: "file",
      },
      {
        "x-share-token": this.share_token,
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
  ping() {
    return this.request.post(API_HOST + "/adrive/v2/user/get", {});
  }
  /** 文件移入回收站 */
  async delete_file(file_id: string) {
    await this.ensure_initialized();
    // console.log("drive id is", this.aliyun_drive_id, file_id);
    const r = await this.request.post(
      API_HOST + "/adrive/v2/recyclebin/trash",
      {
        drive_id: this.aliyun_drive_id,
        file_id,
      }
    );
    if (r.error) {
      return r;
    }
    // const r1 = await this.store.delete_folder({
    //   file_id,
    // });
    // if (r1.error) {
    //   return r1;
    // }
    // const r2 = await this.store.delete_episode({
    //   file_id,
    // });
    // if (r2.error) {
    //   return r2;
    // }
    return Result.Ok(null);
  }
  /**
   * 请求接口时返回了 401，并且还有 refresh_token 时，拿 refresh_token 换 access_token
   * @param token 用来获取新 token 的 refresh_token
   */
  async refresh_aliyun_access_token() {
    const refresh_token_resp = await this.request.post<{
      access_token: string;
      refresh_token: string;
    }>(API_HOST + "/v2/account/token", {
      refresh_token: this.refresh_token,
      grant_type: "refresh_token",
    });
    if (refresh_token_resp.error) {
      console.log(
        "refresh token failed, because",
        refresh_token_resp.error.message
      );
      return refresh_token_resp;
    }
    const { access_token } = refresh_token_resp.data;
    // console.log("refresh token success", access_token);
    this.access_token = access_token;
    const patch_aliyun_drive_token_resp = await this.patch_aliyun_drive_token({
      refresh_token: refresh_token_resp.data.refresh_token,
      access_token: refresh_token_resp.data.access_token,
      expired_at: dayjs().add(5, "minute").unix(),
    });
    if (patch_aliyun_drive_token_resp.error) {
      return patch_aliyun_drive_token_resp;
    }
    return Result.Ok(refresh_token_resp.data);
  }
  async create_session() {
    const resp = await this.request.post(
      API_HOST + "/users/v1/users/device/create_session",
      {
        utdid: "Y9UzJWvkWRkDAFX691aWX0xS",
        umid: "MNkB2ehLPC8x0xKGZDDP5BZa6pHglCk5",
        deviceName: "iPhone",
        modelName: "iPhone12,3",
        pubKey: PUBLIC_KEY,
        refreshToken: this.refresh_token,
      }
    );
    if (resp.error) {
      log("create_session failed, because", resp.error.message);
      return resp;
    }
    return resp;
  }
  async renew_session() {
    const { error, data } = await this.request.post<AliyunDriveRecord>(
      API_HOST + "/users/v1/users/device/renew_session",
      {}
    );
    if (error) {
      // console.log("[]renew_session failed", error.message);
      return Result.Err(error);
    }
    // console.log("[]renew_session", data);
    return Result.Ok(data);
  }
  async patch_aliyun_drive_token(data: AliyunDriveToken) {
    if (!this.token_id) {
      return Result.Err("please invoke init before patch aliyun drive token");
    }
    const { refresh_token, access_token, expired_at } = data;
    return this.store.update_aliyun_drive_token(this.token_id, {
      refresh_token,
      access_token,
      expired_at,
    });
  }
  /** 签到 */
  async checked_in() {
    await this.ensure_initialized();
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
    return Result.Ok(data);
  }
}

function format_M3U8_manifest(videos: PartialVideo[]) {
  const result: {
    name: string;
    width: number;
    height: number;
    type: string;
    url: string;
  }[] = [];
  for (let i = 0; i < videos.length; i += 1) {
    const {
      url,
      status,
      template_id,
      template_name,
      template_width,
      template_height,
    } = videos[i];
    if (status === "finished") {
      result.push({
        name: template_name,
        width: template_width,
        height: template_height,
        type: template_id,
        url,
      });
    }
  }
  return result;
}
