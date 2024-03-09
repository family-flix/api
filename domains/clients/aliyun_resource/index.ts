/**
 * @file 阿里云盘分享资源文件夹 client
 */
import dayjs from "dayjs";

import { BaseDomain } from "@/domains/base";
import { Article, ArticleLineNode, ArticleSectionNode, ArticleTextNode } from "@/domains/article";
import { AliyunDriveClient } from "@/domains/clients/alipan";
import { DataStore } from "@/domains/store/types";
import { User } from "@/domains/user";
import { AliyunDriveFileResp } from "@/domains/clients/alipan/types";
import { DriveClient } from "@/domains/clients/types";
import { build_drive_file, run } from "@/domains/clients/utils";
import { Result } from "@/types";
import { sleep } from "@/utils";

const API_HOST = "https://api.aliyundrive.com";
const DEFAULT_ROOT_FOLDER_ID = "root";

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
  [Events.StateChange]: AliyunShareResourceClientState;
};
type AliyunShareResourceClientProps = {
  id: string;
  unique_id: string;
  code: string | null;
  client: AliyunDriveClient;
  store: DataStore;
};
type AliyunShareResourceClientState = {};
export class AliyunShareResourceClient extends BaseDomain<TheTypesOfEvents> implements DriveClient {
  static async Get(options: {
    id?: string;
    unique_id?: string;
    url: string;
    code?: string | null;
    user?: User;
    store: DataStore;
  }) {
    const { id, unique_id, url, code = null, user, store } = options;
    const r = await AliyunDriveClient.Get({
      id,
      unique_id,
      user,
      store,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const client = r.data;
    const client2 = new AliyunShareResourceClient({
      id: r.data.id,
      unique_id: url,
      code,
      client,
      store,
    });
    const r2 = await client2.fetch_share_profile(url, { code });
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    return Result.Ok(client2);
  }
  /** 从分享资源链接中获取 share_id*/
  static GetShareId(url: string) {
    const r = url.match(/\/s\/([0-9a-zA-Z]{11})/);
    if (!r) {
      // Invalid url, it must includes share_id like 'hFgvpSXzCYd' at the end of ur
      return Result.Err("不是合法的资源链接");
    }
    return Result.Ok(r[1]);
  }

  /** aliyun drive_id */
  id: string;
  /** resource url */
  unique_id: string;
  token: string = "";
  root_folder: { id: string; name: string } | null = null;

  token_expired_at: number = 0;
  name: string = "";
  title: string = "";
  url: string;
  code: string | null;
  size = 10;

  store: DataStore;
  client: AliyunDriveClient;

  get request() {
    return {
      get: this.client.request.get.bind(this.client),
      post: this.client.request.post.bind(this.client),
    };
  }
  get ensure_initialized() {
    return this.client.ensure_initialized.bind(this.client);
  }

  constructor(props: Partial<{ _name: string }> & AliyunShareResourceClientProps) {
    super(props);

    const { id, unique_id, code, client, store } = props;

    this.id = id;
    this.unique_id = unique_id;
    this.root_folder = client.root_folder;
    this.url = unique_id;
    this.code = code;
    this.client = client;
    this.store = store;
  }
  /**
   * 获取分享详情（初始化）
   */
  async fetch_share_profile(url: string, options: Partial<{ code: string | null; force: boolean }> = {}) {
    // console.log("[DOMAIN]fetch_share_profile", url, options);
    const { code, force = false } = options;
    const r = AliyunShareResourceClient.GetShareId(url);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const share_id = r.data;
    this.id = share_id;
    if (this.token) {
      // 如果曾经调用过该方法获取到了 share_token，再次调用时就不会真正去调用了，而是复用之前获取到的
      return Result.Ok({
        id: share_id,
        token: this.token,
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
      return Result.Err(r1.error);
    }
    const token_r = await (async () => {
      if (!this.code) {
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
        this.token = share_token;
        this.token_expired_at = dayjs().add(expires_in, "second").valueOf();
        return Result.Ok({
          token: share_token,
        });
      }
      return Result.Ok({
        token: this.token,
      });
    })();
    if (token_r.error) {
      return Result.Err(token_r.error);
    }
    const token = token_r.data.token;
    const { share_name, share_title, file_infos = [] } = r1.data;
    this.title = share_title;
    this.name = share_name;
    return Result.Ok({
      id: share_id,
      token,
      // share_name,
      // share_title,
      // files: file_infos,
    });
  }
  /** 获取文件列表 */
  async fetch_files(
    /** 该文件夹下的文件列表，默认 root 表示根目录 */
    file_id: string = DEFAULT_ROOT_FOLDER_ID,
    options: Partial<{
      /** 每页数量 */
      page_size: number;
      /** 下一页标志 */
      marker: string;
      sort: { field: "name" | "updated_at" | "size"; order: "asc" | "desc" }[];
    }> = {}
  ) {
    const { marker, page_size = 20 } = options;
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
        share_id: this.id,
        video_thumbnail_process: "video/snapshot,t_1000,f_jpg,ar_auto,w_256",
      },
      {
        "x-share-token": this.token,
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
  async fetch_file(file_id: string) {
    const r = await this.request.post<{
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
        image_thumbnail_process: "image/resize,w_1920/format,jpeg",
        share_id: this.id,
      },
      {
        "x-share-token": this.token,
      }
    );
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { name, type, thumbnail, parent_file_id } = r.data;
    const file = build_drive_file({
      file_id,
      name,
      type,
      parent_file_id,
      thumbnail,
    });
    return Result.Ok(file);
  }
  async search_files(
    options: Partial<{
      keyword: string;
      page_size: number;
      type?: "file" | "folder";
      marker?: string;
    }>
  ) {
    const { keyword, page_size = 20 } = options;
    const r3 = await this.request.post<{
      items: AliyunDriveFileResp[];
    }>(
      API_HOST + "/recommend/v1/shareLink/search",
      {
        keyword,
        limit: page_size,
        order_by: "name DESC",
        share_id: this.id,
      },
      {
        "x-share-token": this.token,
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
      next_marker: "",
    });
  }
  /**
   * 转存分享的文件
   * 在同步资源时使用
   */
  async save_shared_files(options: {
    /** 要转存的文件/文件夹 id */
    file_id: string;
    /** 转存到网盘指定的文件夹 id */
    target_file_id?: string;
  }) {
    await this.ensure_initialized();
    const { file_id, target_file_id = this.root_folder?.id } = options;
    if (!target_file_id) {
      return Result.Err("请指定转存到云盘哪个文件夹");
    }
    const r2 = await this.request.post(
      API_HOST + "/v2/file/copy",
      {
        share_id: this.id,
        file_id,
        to_parent_file_id: target_file_id,
        to_drive_id: String(this.unique_id),
      },
      {
        "x-share-token": this.token,
      }
    );
    if (r2.error) {
      return Result.Err(r2.error);
    }
    return Result.Ok(null);
  }
  /** 一次转存多个分享的文件 */
  async save_multiple_shared_files(options: {
    /** 需要转存的文件 */
    files: {
      file_id: string;
    }[];
    /** 转存到网盘指定的文件夹 id */
    target_file_id?: string;
  }) {
    await this.ensure_initialized();
    const { files, target_file_id = this.root_folder?.id } = options;
    // const { share_id, share_title, share_name, files } = r1.data;
    // this.emit(Events.Print, Article.build_line(["获取分享资源详情成功，共有", String(files.length), "个文件"]));
    // console.log("save_multiple_shared_files", share_files);
    const body = {
      requests: files.map((file, i) => {
        const { file_id } = file;
        return {
          body: {
            auto_rename: true,
            file_id,
            share_id: this.id,
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
      "x-share-token": this.token,
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
    return Result.Ok(null);
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
  /** 分享资源不能直接下载 */
  async download(file_id: string) {
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
      url: r2.data.url,
    });
  }

  async ping() {
    return Result.Err("请实现 ping 方法");
  }
  async refresh_profile() {
    return Result.Err("请实现 refresh_profile 方法");
  }
  async existing() {
    return Result.Err("请实现 existing 方法");
  }
  async rename_file() {
    return Result.Err("请实现 rename_file 方法");
  }
  async delete_file() {
    return Result.Err("请实现 delete_file 方法");
  }
  async fetch_parent_paths() {
    return Result.Err("请实现 fetch_parent_paths 方法");
  }
  async fetch_video_preview_info() {
    return Result.Err("请实现 fetch_video_preview_info 方法");
  }
  async create_folder() {
    return Result.Err("请实现 create_folder 方法");
  }
  async move_files_to_folder() {
    return Result.Err("请实现 move_files_to_folder 方法");
  }
  async upload() {
    return Result.Err("请实现 upload 方法");
  }
  async fetch_content() {
    return Result.Err("请实现 upload 方法");
  }
  async checked_in() {
    return Result.Err("请实现 checked_in 方法");
  }
}
