/**
 * @file 夸克云盘
 */
import Joi from "joi";

import { BaseDomain } from "@/domains/base";
import { User } from "@/domains/user";
import { DataStore } from "@/domains/store/types";
import { DriveClient } from "@/domains/clients/types";
import { build_drive_file } from "@/domains/clients/utils";
import { Result, resultify } from "@/domains/result/index";
import { request_factory } from "@/domains/request/utils";
import { RequestCore } from "@/domains/request/index";
import { HttpClientCore } from "@/domains/http_client/index";
import { connect } from "@/domains/http_client/provider.axios";
import { DriveTypes } from "@/domains/drive/constants";
import { query_stringify, sleep, parseJSONStr, r_id } from "@/utils/index";
import { MediaResolutionTypes } from "@/constants/index";

import { QuarkDriveFileResp, QuarkDriveProfile, QuarkDrivePayload } from "./types";

const DEFAULT_ROOT_FOLDER_ID = "0";
const pc_client = request_factory({
  hostnames: {
    prod: "https://drive-pc.quark.cn",
  },
  headers: {
    accept: "application/json, text/plain, */*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "content-type": "application/json;charset=UTF-8",
    origin: "https://pan.quark.cn",
    priority: "u=1, i",
    referer: "https://pan.quark.cn/",
    "sec-ch-ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  },
  process(r) {
    if (r.error) {
      return r;
    }
    const { status, code, msg, timestamp, data } = r.data;
    if (code !== 0) {
      return Result.Err(msg);
    }
    return Result.Ok(data);
  },
});

enum Events {
  StateChange,
}
type TheTypesOfEvents = {
  [Events.StateChange]: QuarkDriveClientState;
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
    const { access_token, refresh_token } = token_res.data;
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
  $store: DataStore;
  $client = new HttpClientCore();

  constructor(props: Partial<{ _name: string }> & QuarkDriveClientProps) {
    super(props);

    const { id, unique_id, token, store } = props;

    this.id = id;
    this.unique_id = unique_id;
    this.token = token;
    this.$store = store;
    connect(this.$client);
    pc_client.appendHeaders({
      cookie: `__pus=${this.token}`,
      // cookie:
      //   "ctoken=eieL4yfUDP2rxoD3NQIxVVn7; b-user-id=a2ecb52e-9110-be0e-1f8b-559bd109c4c9; grey-id=e8072998-7860-7a04-236f-6f05b3f47f53; grey-id.sig=GcywcDCBRvIb1L0EAHqFe1ToltCNx3iqvhg7nSi9z34; __wpkreporterwid_=8c06094d-b85b-44d8-08e4-82c18d8d3638; _UP_A4A_11_=wb965140c41f4eff9e8085c2a25496d3; _UP_30C_6A_=st9656201b8ld2vv125juamu27llms8m; _UP_TS_=sg197f45b2912abd70943a7c51f9bed2ba7; _UP_E37_B7_=sg197f45b2912abd70943a7c51f9bed2ba7; _UP_TG_=st9656201b8ld2vv125juamu27llms8m; _UP_335_2B_=1; tfstk=fS8ENBsUCavscW-lQO_PQKn2gT_dzZHXxU65ZQAlO9XhOwOkbQOq9_9BZT-PILhLRwDLrTAvBM6HFwwrzd7h2H65dT7ywKlshqgX9BQRoxMjl38hQTbAtyfuFGjGi39Rtk3X9BFMXK_P4qZz16SrUTvlxGfGZO2lr9bo_OfPMu2HEacwsOC5tkXhECAGis5osX8DyR55xvhoWFZZpbshnBXHOp8ipMqpsOzurF-NYtDPQz4k76ROBZdT-qWMA3YCSeDgeNAvfpfNu2yAThA2QiT_Cz_DDd8PmZoS9ZYpZnKkTVkcbnJMD1KtUuW2qBtv5MP4YaTese19USqBsgx6JiLIIy7DDB_BqKD_A9x2qesdyJSrC8CiLT8JY8qlx1CNhfliZxp1tp7hbcr82Mhd_tGhxuERxt1Nhfla2uIpm1WjtMf..; __itrace_wid=d164c2b2-6ea4-456f-2870-23b8b5bdcc1c; __chkey=; _UP_D_=pc; __pus=251cc95b68305c3068849cd709c2fe69AATosz7ayQV97l0sTAidY68EKSesA3P5QsfVKfuL0rsNZQLBMHasgZYaEYO6dVOsTHztBjKkONZQ3fTTZSJ//xa4; __kp=456f2fd0-2864-11ef-9572-639414945abf; __kps=AARSkxQqOKBEID5PUB4pg2lt; __ktd=i01zXsmiwy9A4la/5wsvYA==; __uid=AARSkxQqOKBEID5PUB4pg2lt; __puus=72a06bddc5e0b9277ae6bbc6140efffaAASJK8gRX2S5hCc097Sia8h2lnVGLQWGkp+SJu3c8NRnmGK2yTd2tYatWSCui3m95ORALKllb4vYvrovMRrMvHROS3ku9PLFfPmVxdAm5yuH03KGoVH5mExUDlB9CEFgQEW1ey2chzn0VUeSMGGs0NH+3+vaq93S+LzDzEAdyUjHB5hmlNy1SYGMspyLfIhCEs/cdtEdi2I6ZSx5KVDJedeg; Video-Auth=55PinJmcU4BikYhwgTriETpfAgQ9wknVjZV1/DDChgD9znDbJFCv3hCFKt6d+zaPEOqNk4KQBQdZ//LE0CTqPQ==",
      // cookie:
      //   "_UP_A4A_11_=wb965140c41f4eff9e8085c2a25496d3; _UP_30C_6A_=st9656201b8ld2vv125juamu27llms8m; _UP_TS_=sg197f45b2912abd70943a7c51f9bed2ba7; _UP_E37_B7_=sg197f45b2912abd70943a7c51f9bed2ba7; _UP_TG_=st9656201b8ld2vv125juamu27llms8m; _UP_335_2B_=1; tfstk=fS8ENBsUCavscW-lQO_PQKn2gT_dzZHXxU65ZQAlO9XhOwOkbQOq9_9BZT-PILhLRwDLrTAvBM6HFwwrzd7h2H65dT7ywKlshqgX9BQRoxMjl38hQTbAtyfuFGjGi39Rtk3X9BFMXK_P4qZz16SrUTvlxGfGZO2lr9bo_OfPMu2HEacwsOC5tkXhECAGis5osX8DyR55xvhoWFZZpbshnBXHOp8ipMqpsOzurF-NYtDPQz4k76ROBZdT-qWMA3YCSeDgeNAvfpfNu2yAThA2QiT_Cz_DDd8PmZoS9ZYpZnKkTVkcbnJMD1KtUuW2qBtv5MP4YaTese19USqBsgx6JiLIIy7DDB_BqKD_A9x2qesdyJSrC8CiLT8JY8qlx1CNhfliZxp1tp7hbcr82Mhd_tGhxuERxt1Nhfla2uIpm1WjtMf..; _UP_D_=pc; __pus=251cc95b68305c3068849cd709c2fe69AATosz7ayQV97l0sTAidY68EKSesA3P5QsfVKfuL0rsNZQLBMHasgZYaEYO6dVOsTHztBjKkONZQ3fTTZSJ//xa4; __kp=456f2fd0-2864-11ef-9572-639414945abf; __kps=AARSkxQqOKBEID5PUB4pg2lt; __ktd=i01zXsmiwy9A4la/5wsvYA==; __uid=AARSkxQqOKBEID5PUB4pg2lt; __puus=72a06bddc5e0b9277ae6bbc6140efffaAASJK8gRX2S5hCc097Sia8h2lnVGLQWGkp+SJu3c8NRnmGK2yTd2tYatWSCui3m95ORALKllb4vYvrovMRrMvHROS3ku9PLFfPmVxdAm5yuH03KGoVH5mExUDlB9CEFgQEW1ey2chzn0VUeSMGGs0NH+3+vaq93S+LzDzEAdyUjHB5hmlNy1SYGMspyLfIhCEs/cdtEdi2I6ZSx5KVDJedeg; Video-Auth=55PinJmcU4BikYhwgTriETpfAgQ9wknVjZV1/DDChgD9znDbJFCv3hCFKt6d+zaPEOqNk4KQBQdZ//LE0CTqPQ==",
    });
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
    const request = new RequestCore(
      (values: { file_id: string; page_size: number; page: number }) => {
        return pc_client.get<{
          last_view_list: unknown[];
          recent_file_list: unknown[];
          list: QuarkDriveFileResp[];
        }>("/1/clouddrive/file/sort", {
          pr: "ucpro",
          fr: "pc",
          uc_param_str: "",
          pdir_fid: values.file_id,
          _page: values.page,
          _size: values.page_size,
          _fetch_total: 1,
          _fetch_sub_dirs: 0,
          _sort: "file_type:asc,updated_at:desc",
        });
      },
      { client: this.$client }
    );
    const r = await request.run({ file_id, page, page_size });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { list } = r.data;
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
    const request = new RequestCore(
      (values: { file_id: string }) => {
        return pc_client.get<QuarkDriveFileResp>("/1/clouddrive/file/info", {
          pr: "ucpro",
          fr: "pc",
          uc_param_str: "",
          fid: values.file_id,
          _fetch_full_path: 1,
        });
      },
      { client: this.$client }
    );
    const r = await request.run({ file_id });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const file = r.data;
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
    const request = new RequestCore(
      (values: { name: string; page: number; page_size: number }) => {
        return pc_client.post<{
          items: QuarkDriveFileResp[];
        }>("/1/clouddrive/file/search", {
          pr: "ucpro",
          fr: "pc",
          uc_param_str: "",
          q: values.name,
          _page: values.page,
          _size: values.page_size,
          _fetch_total: "1",
          _sort: "file_type:desc,updated_at:desc",
          _is_hl: "1",
        });
      },
      { client: this.$client }
    );
    const r = await request.run({ name, page, page_size });
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
    const request = new RequestCore(
      (values: { file_id: string }) => {
        const search = query_stringify({
          pr: "ucpro",
          fr: "pc",
          uc_param_str: "",
        });
        return pc_client.post<{
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
      },
      { client: this.$client }
    );
    const r = await request.run({ file_id });
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
    const request = new RequestCore(
      (values: { file_id: string; next_name: string }) => {
        const search = query_stringify({
          pr: "ucpro",
          fr: "pc",
          uc_param_str: "",
        });
        return pc_client.post<{
          status: number;
          code: number;
          message: string;
          timestamp: number;
          data: {};
        }>("/1/clouddrive/file/rename?" + search, {
          fid: values.file_id,
          file_name: values.next_name,
        });
      },
      { client: this.$client }
    );
    const r = await request.run({ file_id, next_name });
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
    const request = new RequestCore(
      (values: { name: string; parent_file_id: string }) => {
        const search = query_stringify({
          pr: "ucpro",
          fr: "pc",
          uc_param_str: "",
        });
        return pc_client.post<{
          status: number;
          code: number;
          message: string;
          timestamp: number;
          data: {
            finish: boolean;
            fid: string;
          };
          metadata: {};
        }>("/1/clouddrive/file?" + search, {
          dir_init_lock: false,
          dir_path: "",
          file_name: values.name,
          pdir_fid: values.parent_file_id,
        });
      },
      { client: this.$client }
    );
    const r = await request.run({ name, parent_file_id });
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
    // return Result.Err("请实现 fetch_video_preview_info 方法");
    const e = await this.ensure_initialized();
    const request = new RequestCore(
      (values: { file_id: string }) => {
        return pc_client.post<{
          default_resolution: string;
          origin_default_resolution: string;
          video_list: {
            resolution: string;
            video_info: {
              duration: number;
              size: number;
              format: string;
              width: number;
              height: number;
              bitrate: number;
              codec: string;
              fps: number;
              rotate: number;
              audio: {
                duration: number;
                bitrate: number;
                codec: string;
                channels: number;
              };
              update_time: number;
              file_format: string;
              streams: {
                video_stream_list: {
                  index: string;
                  codec_name: string;
                  codec_long_name: string;
                  profile: string;
                  codec_time_base: string;
                  codec_tag_string: string;
                  codec_tag: string;
                  width: string;
                  height: string;
                  has_bframes: string;
                  sar: string;
                  dar: string;
                  pix_fmt: string;
                  level: string;
                  fps: string;
                  avg_fps: string;
                  timebase: string;
                  start_time: string;
                  duration: string;
                  bitrate: string;
                  lang: string;
                  network_cost: {};
                }[];
                audio_stream_list: {
                  index: string;
                  codec_name: string;
                  codec_time_base: string;
                  codec_long_name: string;
                  codec_tag_string: string;
                  codec_tag: string;
                  sample_fmt: string;
                  samplerate: string;
                  channels: string;
                  channel_layout: string;
                  timebase: string;
                  start_time: string;
                  duration: string;
                  bitrate: string;
                  lang: string;
                }[];
                subtitle_stream_list: unknown[];
              };
              format_ext: {
                num_streams: string;
                num_programs: string;
                format_name: string;
                format_long_name: string;
                start_time: string;
                duration: string;
                size: string;
                bitrate: string;
              };
              url: string;
              resolution: string;
              hls_type: string;
              finish: boolean;
              resoultion: string;
              success: boolean;
            };
            right: string;
            member_right: string;
            trans_status: string;
            accessable: boolean;
            supports_format: string;
          }[];
          audio_list: unknown[];
          file_name: string;
          name_space: number;
          size: number;
          thumbnail: string;
          last_play_info: {
            time: number;
          };
          seek_preview_data: {
            total_frame_count: number;
            total_sprite_count: number;
            frame_width: number;
            frame_height: number;
            sprite_row: number;
            sprite_column: number;
            preview_sprite_infos: {
              url: string;
              frame_count: number;
              times: number[];
            }[];
          };
          obj_key: string;
          meta: {
            duration: number;
            size: number;
            format: string;
            width: number;
            height: number;
            bitrate: number;
            codec: string;
            fps: number;
            rotate: number;
          };
          preload_level: number;
        }>(
          "/1/clouddrive/file/v2/play" +
            "?" +
            query_stringify({
              pr: "ucpro",
              fr: "pc",
              uc_param_str: "",
            }),
          {
            fid: values.file_id,
            resolutions: "normal,low,high,super,2k,4k",
            supports: "fmp4,m3u8",
          }
        );
      },
      { client: this.$client }
    );
    const r = await request.run({ file_id });
    if (r.error) {
      return Result.Err(r.error);
    }
    const { video_list } = r.data;
    const ResolutionMap: Record<string, MediaResolutionTypes> = {
      super: MediaResolutionTypes.FHD,
      high: MediaResolutionTypes.HD,
      low: MediaResolutionTypes.LD,
    };
    return Result.Ok({
      sources: video_list
        .filter((file) => file.accessable)
        .map((file) => {
          return {
            name: "",
            width: file.video_info.width,
            height: file.video_info.height,
            type: ResolutionMap[file.video_info.resolution],
            url: file.video_info.url,
            invalid: 0,
          };
        }),
      subtitles: [] as {
        id: string;
        name: string;
        url: string;
        language: "chi" | "chs" | "eng" | "jpn";
      }[],
    });
  }
  async fetch_video_preview_info_for_download() {
    return Result.Err("请实现 fetch_video_preview_info_for_download 方法");
  }
  /** 获取一个文件夹的完整路径（包括自身） */
  async fetch_parent_paths(file_id: string) {
    await this.ensure_initialized();
    const paths: {
      file_id: string;
      name: string;
      parent_file_id: string;
      type: "folder";
    }[] = [];
    let can_finish = true;
    let id = file_id;
    while (can_finish) {
      const r1 = await this.fetch_file(id);
      if (r1.error) {
        return Result.Err(r1.error.message);
      }
      const file = r1.data;
      paths.unshift({
        file_id: file.file_id,
        name: file.name,
        parent_file_id: file.parent_file_id,
        type: "folder",
      });
      id = file.parent_file_id;
      if (file.parent_file_id === DEFAULT_ROOT_FOLDER_ID) {
        can_finish = false;
      }
    }
    return Result.Ok(paths);
  }
  /** 根据名称判断一个文件是否已存在 */
  async existing(parent_file_id: string, file_name: string) {
    // await this.ensure_initialized();
    return Result.Err("请实现 existing 方法");
  }
  /** 移动指定文件到指定文件夹 */
  async move_files_to_folder(body: { files: { file_id: string }[]; target_folder_id: string }) {
    // await this.ensure_initialized();
    return Result.Err("请实现 move_files_to_folder 方法");
  }
  async prepare_upload() {
    // const e = await this.ensure_initialized();
    return Result.Err("请实现 prepare_upload 方法");
  }
  async download(file_id: string) {
    // await this.ensure_initialized();
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
    const request = new RequestCore(
      (values: { task_id: string }) => {
        const query = {
          pr: "ucpro",
          fr: "pc",
          uc_param_str: "",
          task_id: values.task_id,
          retry_index: "0",
        };
        return pc_client.get<{
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
      },
      { client: this.$client }
    );
    const r = await request.run({ task_id });
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
