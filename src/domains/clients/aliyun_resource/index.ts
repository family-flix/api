/**
 * @file 阿里云盘分享资源文件夹 client
 */
import dayjs from "dayjs";

import { BaseDomain } from "@/domains/base";
import { Article, ArticleLineNode, ArticleSectionNode, ArticleTextNode } from "@/domains/article";
import { AliyunDriveClient } from "@/domains/clients/alipan";
import { DataStore } from "@/domains/store/types";
import { User } from "@/domains/user";
import { DriveClient } from "@/domains/clients/types";
import { build_drive_file, run } from "@/domains/clients/utils";
import { AlipanOpenClient } from "@/domains/clients/alipan_open";
import { Result } from "@/domains/result/index";
import { Drive } from "@/domains/drive/v2";
import { sleep } from "@/utils";

import {
  create_share_link,
  download_file,
  fetch_file,
  get_share_by_anonymous,
  get_share_token,
  list_by_share,
  query_task_status,
  search_files,
  transfer_file_from_resource,
  transfer_file_from_resource_batch,
} from "./services";

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
  // root_folder: { id: string; name: string } | null;
  // client: AliyunDriveClient | AlipanOpenClient;
  store: DataStore;
};
type AliyunShareResourceClientState = {};
export class AliyunShareResourceClient extends BaseDomain<TheTypesOfEvents> implements DriveClient {
  static async Get(options: {
    id?: string;
    unique_id?: string;
    url: string;
    code?: string | null;
    ignore_invalid?: boolean;
    user?: User;
    store: DataStore;
  }) {
    const { url, code = null, user, store } = options;

    const r1 = AliyunShareResourceClient.GetShareId(url);
    if (r1.error) {
      return Result.Err(r1.error.message);
    }
    const client2 = new AliyunShareResourceClient({
      id: r1.data,
      unique_id: url,
      code,
      store,
    });
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

  $store: DataStore;
  // client: AliyunDriveClient | AlipanOpenClient;

  // get ensure_initialized() {
  //   return this.client.ensure_initialized.bind(this.client);
  // }

  constructor(props: Partial<{ _name: string }> & AliyunShareResourceClientProps) {
    super(props);

    const { id, unique_id, code, store } = props;

    this.id = id;
    this.unique_id = unique_id;
    // this.root_folder = root_folder;
    this.url = unique_id;
    this.code = code;
    // this.client = client;
    this.$store = store;
  }
  /**
   * 获取分享详情（初始化）
   */
  async fetch_share_profile() {
    // console.log("[DOMAIN]clients/aliyun_resource - fetch_share_profile", this.url, this.code);
    const url = this.url;
    const code = this.code;
    const r = AliyunShareResourceClient.GetShareId(url);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const share_id = r.data;
    this.id = share_id;
    // console.log("[DOMAIN]fetch_share_profile", this.token);
    if (this.token) {
      // 如果曾经调用过该方法获取到了 share_token，再次调用时就不会真正去调用了，而是复用之前获取到的
      return Result.Ok({
        id: share_id,
        token: this.token,
      });
    }
    // await this.ensure_initialized();
    console.log("[DOMAIN]clients/aliyun_resource - before get_share_by_anonymous");
    const r1 = await get_share_by_anonymous.run({ share_id, code });
    if (r1.error) {
      return Result.Err(r1.error);
    }
    const token_r = await (async () => {
      if (!this.code) {
        const r2 = await get_share_token.run({ share_id, code });
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
    console.log("[DOMAIN]clients/aliyun_resource - after get_share_token");
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
    const r = await this.fetch_share_profile();
    if (r.error) {
      return Result.Err(r.error.message);
    }
    console.log("[DOMAIN]clients/aliyun_resource - before list_by_share", this.id, this.token);
    const r3 = await list_by_share.run({
      file_id,
      share_id: this.id,
      token: this.token,
      options,
    });
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
    await this.fetch_share_profile();
    const r = await fetch_file.run({ file_id, share_id: this.id, token: this.token });
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
    await this.fetch_share_profile();
    const r3 = await search_files.run({
      keyword,
      page_size,
      share_id: this.id,
      token: this.token,
    });
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
    // await this.ensure_initialized();
    await this.fetch_share_profile();
    const { file_id, target_file_id = this.root_folder?.id } = options;
    if (!target_file_id) {
      return Result.Err("请指定转存到云盘哪个文件夹");
    }
    const r2 = await transfer_file_from_resource.run({
      file_id,
      target_file_id,
      unique_id: this.unique_id,
      share_id: this.id,
      token: this.token,
    });
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
    if (!options.target_file_id) {
      return Result.Err("请指定要转存到哪个文件夹");
    }
    // await this.ensure_initialized();
    await this.fetch_share_profile();
    const { files, target_file_id } = options;
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
    const r2 = await transfer_file_from_resource_batch.run(body, { token: this.token });
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
    const r2 = await query_task_status.run(body);
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
    // await this.ensure_initialized();
    const body = {
      expiration: dayjs().add(1, "day").toISOString(),
      sync_to_homepage: false,
      share_pwd: "",
      drive_id: String(this.unique_id),
      file_id_list: file_ids,
    };
    // console.log("[DOMAIN]AliyunDrive - create_shared_resource", body);
    const r = await create_share_link.run(body);
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
  async download(file_id: string) {
    await this.fetch_share_profile();
    const r2 = await download_file.run({ file_id, share_id: this.id, token: this.token });
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
  async fetch_video_preview_info_for_download() {
    return Result.Err("请实现 fetch_video_preview_info_for_download 方法");
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
  async generate_thumbnail() {
    return Result.Err("请实现 generate_thumbnail 方法");
  }
  on_print() {
    return () => {};
  }
}
