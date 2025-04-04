/**
 * @file Alist
 */
import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import Joi from "joi";
import axios from "axios";

import { BaseDomain } from "@/domains/base";
import { User } from "@/domains/user/index";
import { FileManage } from "@/domains/uploader";
import { DataStore } from "@/domains/store/types";
import { DriveClient } from "@/domains/clients/types";
import { build_drive_file } from "@/domains/clients/utils";
import { DriveTypes } from "@/domains/drive/constants";
import { HttpClientCore } from "@/domains/http_client/index";
import { connect } from "@/domains/http_client/provider.axios";
import { Result, resultify } from "@/domains/result/index";
import { RequestFactory, request_factory } from "@/domains/request/utils";
import { RequestCore } from "@/domains/request/index";
import { query_stringify, sleep, parseJSONStr, r_id } from "@/utils";
import { MediaResolutionTypes } from "@/constants";

import { AlistFileResp, DriveAlistProfile, DriveAlistPayload } from "./types";

const DEFAULT_ROOT_FOLDER_ID = "/";

enum Events {
  StateChange,
}
type TheTypesOfEvents = {
  [Events.StateChange]: DriveAlistClientState;
};
type Drive115ClientProps = {
  id: string;
  unique_id: string;
  token: string;
  store: DataStore;
};
type DriveAlistClientState = {};
export class DriveAlistClient extends BaseDomain<TheTypesOfEvents> implements DriveClient {
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
    const r = parseJSONStr<DriveAlistProfile>(drive.profile);
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
      new DriveAlistClient({
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
      url: Joi.string().required(),
      token: Joi.string().allow(""),
      password: Joi.string().allow(""),
    });
    const r = await resultify(schema.validateAsync.bind(schema))(payload);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { url, token } = r.data as DriveAlistPayload;
    const existing_drive = await store.prisma.drive.findUnique({
      where: {
        user_id_unique_id: {
          unique_id: url,
          user_id: user.id,
        },
      },
    });
    if (existing_drive) {
      return Result.Err("该云盘已存在，请检查信息后重试", undefined, { id: existing_drive.id });
    }
    const drive_record_id = r_id();
    const client = new DriveAlistClient({
      id: drive_record_id,
      unique_id: url,
      token,
      store,
    });
    const created_drive = await store.prisma.drive.create({
      data: {
        id: drive_record_id,
        name: url,
        avatar: "",
        type: DriveTypes.Alist,
        unique_id: url,
        profile: JSON.stringify({ name: url } as DriveAlistProfile),
        root_folder_id: null,
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
  request: RequestFactory;
  client: HttpClientCore;
  $store: DataStore;

  constructor(props: Partial<{ _name: string }> & Drive115ClientProps) {
    super(props);

    const { id, unique_id, token, store } = props;

    this.id = id;
    this.unique_id = unique_id;
    this.token = token;
    this.$store = store;
    this.request = request_factory({
      hostnames: { prod: unique_id },
      headers: {
        authorization: "",
      },
      process: <T>(r: Result<{ code: number; message: string; data: T }>): Result<T> => {
        if (r.error) {
          return Result.Err(r.error.message);
        }
        if (r.data.code !== 200) {
          return Result.Err(r.data.message);
        }
        return Result.Ok(r.data.data as T);
      },
    });
    const client = new HttpClientCore({
      headers: {},
    });
    connect(client);
    this.client = client;
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
      const { data } = drive_record.drive_token;
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
      return Result.Ok({
        access_token,
        refresh_token,
      });
    })();
    if (token_res.error) {
      return Result.Err(token_res.error.message);
    }
    const { access_token, refresh_token } = token_res.data;
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
    const r = await new RequestCore(
      () => {
        return this.request.get("/", {
          ct: "ajax",
          ac: "nav",
          _: dayjs().valueOf(),
        });
      },
      { client: this.client }
    ).run();
    if (r.error) {
      return r;
    }
    return Result.Ok(r.data);
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
    console.log("[DOMAIN]115 - fetch_files", file_id, options);
    if (file_id === undefined) {
      return Result.Err("请传入要获取的文件夹 file_id");
    }
    const { page_size = 20, page = 1, sort = [{ field: "name", order: "desc" }] } = options;
    const r = await new RequestCore(
      (body: { page: number; password: string; path: string; per_page: number; refresh: boolean }) => {
        return this.request.post<{
          content: {
            name: string;
            size: number;
            is_dir: boolean;
            modified: string;
            created: string;
            sign: string;
            thumb: string;
            type: number;
            hashinfo: string;
            hash_info: {
              sha1: string;
            };
          }[];
          total: number;
          readme: string;
          header: string;
          write: boolean;
          provider: string;
        }>("/api/fs/list", body);
      },
      { client: this.client }
    ).run({
      page: page,
      password: "",
      path: file_id,
      per_page: 0,
      refresh: false,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { content, total } = r.data;
    const result = {
      count: total,
      items: [
        ...content.map((file) => {
          const { name, size, is_dir, modified, created, sign, thumb, type, hashinfo, hash_info } = file;
          const data = build_drive_file({
            type: is_dir ? "folder" : "file",
            file_id: [file_id, name].join("/"),
            name: name,
            parent_file_id: file_id,
            mime_type: "",
            size: size,
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
    const r = await new RequestCore(
      (body: { password: string; path: string }) => {
        return this.request.post<{
          name: string;
          size: number;
          is_dir: boolean;
          modified: string;
          created: string;
          sign: string;
          thumb: string;
          type: number;
          hashinfo: string;
          hash_info: null;
          raw_url: string;
          readme: string;
          header: string;
          provider: string;
          related: null;
        }>("/api/fs/get", body);
      },
      { client: this.client }
    ).run({
      password: "",
      path: file_id,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const file = r.data;
    const { name, size, is_dir, modified, created, sign, thumb, type, hashinfo, hash_info } = file;
    const data = build_drive_file({
      type: is_dir ? "folder" : "file",
      file_id,
      name: name,
      parent_file_id: file_id,
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
    return Result.Err("请实现 search_files 方法");
  }
  async delete_file(file_id: string) {
    return Result.Err("请实现 delete_file 方法");
  }
  async rename_file(file_id: string, next_name: string) {
    return Result.Err("请实现 rename_file 方法");
  }
  /** 添加文件夹 */
  async create_folder(
    params: { parent_file_id?: string; name: string },
    options: Partial<{ check_name_mode: "refuse" | "auto_rename" | "ignore" }> = {}
  ) {
    return Result.Err("请实现 create_folder 方法");
  }
  /** 将云盘内的文件，移动到另一个云盘 */
  async move_files_to_drive(body: {
    file_ids: string[];
    target_drive_client: DriveAlistClient;
    target_folder_id?: string;
  }) {
    return Result.Err("请实现该方法");
  }
  async fetch_video_preview_info(file_id: string): Promise<
    Result<{
      sources: {
        name: string;
        width: number;
        height: number;
        type: MediaResolutionTypes;
        url: string;
        invalid: number;
      }[];
      subtitles: { id: string; name: string; url: string; language: "chi" | "chs" | "eng" | "jpn" }[];
    }>
  > {
    const r = await (async () => {
      try {
        const response = await axios.post(
          "http://127.0.0.1:5244/api/fs/get",
          {
            path: file_id.replace(/^\/\//g, "/"),
            password: "",
          },
          {
            headers: {
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
              Authorization:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicHdkX3RzIjoxNzQzNjg1NjIxLCJleHAiOjE3NDM4NTg0MjcsIm5iZiI6MTc0MzY4NTYyNywiaWF0IjoxNzQzNjg1NjI3fQ.MErp3A7PJoPgVN3io12IWJHM01I4mYwE10I593tq8hs",
              Connection: "keep-alive",
              "Content-Type": "application/json;charset=UTF-8",
              Origin: "http://127.0.0.1:5244",
              Referer: "http://127.0.0.1:5244/115/downloads/%E5%BA%86%E4%BD%99%E5%B9%B4%E7%AC%AC%E4%BA%8C%E5%AD%A3",
              "Sec-Fetch-Dest": "empty",
              "Sec-Fetch-Mode": "cors",
              "Sec-Fetch-Site": "same-origin",
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
              "sec-ch-ua": '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": '"macOS"',
            },
          }
        );
        return Result.Ok(response.data);
      } catch (err) {
        return Result.Err((err as Error).message);
      }
    })();
    // const r = await new RequestCore(
    //   (body: { password: string; path: string }) => {
    //     return this.request.post<{
    //       name: string;
    //       size: number;
    //       is_dir: boolean;
    //       modified: string;
    //       created: string;
    //       sign: string;
    //       thumb: string;
    //       type: number;
    //       hashinfo: string;
    //       hash_info: null;
    //       raw_url: string;
    //       readme: string;
    //       header: string;
    //       provider: string;
    //       related: null;
    //     }>("/api/fs/get", body, {
    //       headers: {
    //         Accept: "application/json, text/plain, */*",
    //         "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    //         Origin: this.request.hostname,
    //         // Referer: `${this.request.hostname}/${file_id}`,
    //         "Content-Type": "application/json;charset=UTF-8",
    //         "Sec-Fetch-Site": "same-origin",
    //         "Sec-Fetch-Mode": "cors",
    //         "Sec-Fetch-Dest": "empty",
    //         "User-Agent":
    //           "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    //       },
    //     });
    //   },
    //   { client: this.client }
    // ).run({
    //   password: "",
    //   path: "/115/downloads/庆余年第二季/22.mkv",
    // });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    if (r.data.code !== 200) {
      return Result.Err(r.data.message);
    }
    const file = r.data.data;
    console.log("file", file);
    const { name, size, is_dir, modified, created, sign, thumb, type, hashinfo, hash_info, raw_url } = file;
    console.log("raw_url", file_id, raw_url);
    // console.log("fix_url", url);
    return Result.Ok({
      thumb_url: "",
      sources: [
        {
          url: decodeURIComponent(raw_url),
          name: name,
          width: 1920,
          height: 1080,
          type: MediaResolutionTypes.SD,
          invalid: 0,
        },
      ],
      subtitles: [],
    });
  }
  async fetch_video_preview_info_for_download() {
    return Result.Err("请实现 fetch_video_preview_info_for_download 方法");
  }
  /** 获取一个文件夹的完整路径（包括自身） */
  /** @ts-ignore */
  async fetch_parent_paths(file_id: string) {
    const segments = file_id.split("/");
    const paths = segments
      .map((segment, index) => {
        const file_id = segments.slice(0, index + 1).join("/");
        if (file_id === "") {
          return null;
        }
        const parent_file_id = segments.slice(0, index).join("/");
        return {
          name: segment,
          file_id,
          parent_file_id: parent_file_id || null,
          type: (() => {
            if (segment.includes(".")) {
              return "file";
            }
            return "folder";
          })(),
        };
      })
      .filter((v) => v !== null);
    return Result.Ok(paths);
  }
  /** 根据名称判断一个文件是否已存在 */
  async existing(parent_file_id: string, file_name: string) {
    return Result.Err("请实现 existing 方法");
  }
  /** 移动指定文件到指定文件夹 */
  async move_files_to_folder(body: { files: { file_id: string }[]; target_folder_id: string }) {
    return Result.Err("请实现 move_files_to_folder 方法");
  }
  async prepare_upload() {
    return Result.Ok({
      sources: [],
      subtitles: [],
    });
  }
  async download(file_id: string) {
    return Result.Err("请实现 download 方法");
  }
  async upload() {
    return Result.Err("请实现 upload 方法");
  }
  async generate_thumbnail() {
    return Result.Err("请实现 generate_thumbnail 方法");
  }
  async fetch_content() {
    return Result.Err("请实现 upload 方法");
  }
  async fetch_share_profile(url: string, options: Partial<{ code: string | null; force: boolean }> = {}) {
    return Result.Err("请实现 fetch_share_profile 方法");
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
    //     await this.ensure_initialized();
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
    return Result.Err("请实现 fetch_task_status 方法");
  }
  /** 签到 */
  async checked_in() {
    return Result.Err("请实现 checked_in 方法");
  }
  async refresh_profile() {
    return Result.Err("请实现 refresh_profile 方法");
  }
  on_print() {
    return () => {};
  }
}
