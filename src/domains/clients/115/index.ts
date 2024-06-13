/**
 * @file 115盘
 */
import dayjs from "dayjs";
import Joi from "joi";

import { BaseDomain } from "@/domains/base";
import { User } from "@/domains/user/index";
import { DataStore } from "@/domains/store/types";
import { DriveClient } from "@/domains/clients/types";
import { build_drive_file } from "@/domains/clients/utils";
import { DriveTypes } from "@/domains/drive/constants";
import { HttpClientCore } from "@/domains/http_client/index";
import { connect } from "@/domains/http_client/provider.axios";
import { request, request_factory } from "@/domains/request/utils";
import { RequestCore } from "@/domains/request/index";
import { query_stringify, sleep, parseJSONStr, r_id } from "@/utils";
import { MediaResolutionTypes } from "@/constants";
import { Result, resultify } from "@/types";

import { Drive115FileResp, Drive115Profile, Drive115Payload } from "./types";

const webapi = request_factory({
  hostnames: { prod: "https://webapi.115.com" },
  process: <T>(r: Result<{ errNo: number; error: string }>): Result<T> => {
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { errNo, error, ...rest } = r.data;
    if (errNo !== 0) {
      return Result.Err(error, errNo, null);
    }
    return Result.Ok(rest as T);
  },
});
const userapi = request_factory({
  hostnames: { prod: "https://my.115.com" },
  debug: false,
  process: <T>(r: Result<{ state: boolean; data: T }>): Result<T> => {
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { state, data } = r.data;
    if (state !== true) {
      return Result.Err("请求失败，原因未知");
    }
    return Result.Ok(data);
  },
});

// const API_HOST = "https://drive-pc.quark.cn";
const COMMON_HEADERS = {
  //   authority: "drive-pc.quark.cn",
  //   accept: "application/json, text/plain, */*",
  //   "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  //   origin: "https://pan.quark.cn",
  //   referer: "https://pan.quark.cn/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
};
const DEFAULT_ROOT_FOLDER_ID = "0";

enum Events {
  StateChange,
}
type TheTypesOfEvents = {
  [Events.StateChange]: Drive115ClientState;
};
type Drive115ClientProps = {
  id: string;
  unique_id: string;
  token: string;
  store: DataStore;
};
type Drive115ClientState = {};
export class Drive115Client extends BaseDomain<TheTypesOfEvents> implements DriveClient {
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
    const r = parseJSONStr<Drive115Profile>(drive.profile);
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
      new Drive115Client({
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
      user_id: Joi.string().required(),
      cookie: Joi.string().required(),
    });
    const r = await resultify(schema.validateAsync.bind(schema))(payload);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { user_id, cookie } = r.data as Drive115Payload;
    const existing_drive = await store.prisma.drive.findUnique({
      where: {
        user_id_unique_id: {
          unique_id: String(user_id),
          user_id: user.id,
        },
      },
    });
    if (existing_drive) {
      return Result.Err("该云盘已存在，请检查信息后重试", undefined, { id: existing_drive.id });
    }
    const drive_record_id = r_id();
    const client = new Drive115Client({
      id: drive_record_id,
      unique_id: user_id,
      token: cookie,
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
        name: user_id,
        avatar: "",
        type: DriveTypes.QuarkDrive,
        unique_id: user_id,
        profile: JSON.stringify({ name: user_id } as Drive115Profile),
        root_folder_id: null,
        drive_token: {
          create: {
            id: r_id(),
            data: JSON.stringify({
              access_token: cookie,
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
  request: HttpClientCore;
  $store: DataStore;

  constructor(props: Partial<{ _name: string }> & Drive115ClientProps) {
    super(props);

    const { id, unique_id, token, store } = props;

    this.id = id;
    this.unique_id = unique_id;
    this.token = token;
    this.$store = store;
    this.request = new HttpClientCore({
      headers: {
        ...COMMON_HEADERS,
        cookie: token,
      },
    });
    connect(this.request);
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
    function fetch_user_profile() {
      return userapi.get("/", {
        ct: "ajax",
        ac: "nav",
        _: dayjs().valueOf(),
      });
    }
    const r = await new RequestCore(fetch_user_profile, { client: this.request }).run();
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
    if (file_id === undefined) {
      return Result.Err("请传入要获取的文件夹 file_id");
    }
    await this.ensure_initialized();
    const { page_size = 20, page = 1, sort = [{ field: "name", order: "desc" }] } = options;
    function fetch_files() {
      return webapi.get<{
        data: {
          /** 当前文件 id */
          cid: string;
          aid: string;
          /** 父文件夹id */
          pid: string;
          fdes: number;
          hdf: number;
          ispl: number;
          fvs: number;
          /** 后缀 */
          ico: string;
          /** 文件名 */
          n: string;
          check_code: number;
          check_msg: string;
          fuuid: number;
          fl: unknown[];
          issct: number;
          score: number;
          /** 创建时间 YYYY-MM-DD HH:mm 格式 */
          t: string;
          uid: number;
          /** 文件 id */
          fid: string;
          /** 文件 hash */
          sha: string;
          /** 文件大小 */
          s: number;
        }[];
        count: number;
        sys_count: number;
        file_count: number;
        folder_count: number;
        page_size: number;
        aid: string;
        cid: string;
        is_asc: number;
        star: number;
        is_share: number;
        type: number;
        is_q: number;
        r_all: number;
        stdir: number;
        cur: number;
        min_size: number;
        max_size: number;
        record_open_time: string;
        path: {
          name: string;
          aid: number;
          cid: number;
          pid: number;
          isp: number;
        }[];
        fields: string;
        order: string;
        fc_mix: number;
        cost_time_1: number;
        natsort: number;
        uid: number;
        offset: number;
        limit: number;
        suffix: string;
        state: boolean;
        error: string;
        errNo: number;
      }>("/files", {
        aid: "1",
        cid: file_id,
        o: "user_ptime",
        asc: 0,
        offset: 0,
        show_dir: 1,
        limit: page_size,
        snap: "0",
        natsort: "0",
        record_open_time: "1",
        format: "json",
        fc_mix: "0",
      });
    }
    const r = await new RequestCore(fetch_files, { client: this.request }).run();
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { data, count } = r.data;
    const result = {
      count,
      items: [
        ...data.map((file) => {
          const { n, cid, fid, ico, s } = file;
          const data = build_drive_file({
            type: fid ? "file" : "folder",
            file_id: cid || fid,
            name: n,
            parent_file_id: file_id,
            mime_type: ico,
            size: s,
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
      count: number;
      size: string;
      folder_count: number;
      play_long: number;
      show_play_long: number;
      ptime: string;
      utime: string;
      is_share: string;
      file_name: string;
      pick_code: string;
      sha1: string;
      is_mark: string;
      fvs: number;
      open_time: number;
      score: number;
      desc: string;
      file_category: string;
      paths: {
        file_id: number;
        file_name: string;
      }[];
    }>("/category/get", {
      cid: file_id,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const file = r.data;
    const { file_category, file_name, size, paths } = file;
    const data = build_drive_file({
      type: file_category === "1" ? "file" : "folder",
      file_id,
      name: file_name,
      parent_file_id: String(paths[paths.length - 1].file_id),
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
    }>("/1/clouddrive/file/delete?" + search, {
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
    }>("/1/clouddrive/file/rename?" + search, {
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
    const r = await this.request.post<{
      state: boolean;
      error: string;
      errno: string;
      aid: number;
      cid: string;
      cname: string;
      file_id: string;
      file_name: string;
    }>("/files/add", {
      pid: parent_file_id,
      cname: name,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const { file_id, file_name } = r.data;
    const data = build_drive_file({
      type: "folder",
      file_id,
      name: file_name,
      parent_file_id,
    });
    return Result.Ok(data);
  }
  /** 将云盘内的文件，移动到另一个云盘 */
  async move_files_to_drive(body: {
    file_ids: string[];
    target_drive_client: Drive115Client;
    target_folder_id?: string;
  }) {
    return Result.Err("请实现该方法");
  }
  async fetch_video_preview_info(file_id: string) {
    return Result.Err("请实现 fetch_video_preview_info 方法");
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
    }>("/api/portal/listFiles.action", {
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
      items: Drive115FileResp[];
      next_marker: string;
    }>(url, {});
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
      items: Drive115FileResp[];
    }>("/v3/batch", {
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
    }>("/api/security/generateRsaKey.action", {});
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
    }>("/api/open/file/getFileDownloadUrl.action", {
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
    }>("/1/clouddrive/task", query);
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
  on_print() {
    return () => {};
  }
}
