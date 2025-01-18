/**
 * @file https://www.boju.cc/
 */
import { load } from "cheerio";

import { FakeDatabaseStore } from "@/domains/store/fake";
import { User } from "@/domains/user/index";
import { DriveTypes } from "@/domains/drive/constants";
import { DataStore } from "@/domains/store/types";
import { DriveClient, GenreDriveFile } from "@/domains/clients/types";
import { build_drive_file } from "@/domains/clients/utils";
import { Result, resultify } from "@/domains/result/index";
import { parseJSONStr, r_id } from "@/utils/index";
import { FileType, MediaResolutionTypes } from "@/constants/index";
import { HttpClientCore } from "@/domains/http_client";
import { connect } from "@/domains/http_client/provider.axios";

const folder_re = /\/v\/([0-9]{1,})\.html/;
const file_re = /\/p\/([0-9]{1,})-([0-9]{1,})-([0-9]{1,})\.html/;
type BOJUDriveClientProps = {
  id: string;
  unique_id: string;
  store: DataStore;
};
export class BOJUDriveClient implements DriveClient {
  static URL = "https://www.boju.cc";
  static ROOT_ID = "root";
  static async Get(options: { unique_id: string; user?: User; store?: DataStore }) {
    const { unique_id, store } = options;
    if (!store) {
      //       return Result.Ok(new BOJUDriveClient({ unique_id }));
      return Result.Err("缺少 store");
    }
    const drive = await store.prisma.drive.findFirst({
      where: {
        unique_id,
      },
    });
    if (!drive) {
      return Result.Err("没有匹配的记录");
    }
    return Result.Ok(new BOJUDriveClient({ id: drive.id, unique_id, store }));
  }
  static async Create(values: { user: User; store: DataStore }) {
    const { user, store } = values;
    const unique_id = BOJUDriveClient.URL;
    const name = "www_boju_cc";
    const existing_drive = await store.prisma.drive.findUnique({
      where: {
        user_id_unique_id: {
          unique_id,
          user_id: user.id,
        },
      },
    });
    if (existing_drive) {
      return Result.Err("该云盘已存在，请检查信息后重试", undefined, { id: existing_drive.id });
    }
    const drive_record_id = r_id();
    const client = new BOJUDriveClient({
      id: drive_record_id,
      unique_id,
      store,
    });
    const created_drive = await store.prisma.drive.create({
      data: {
        id: drive_record_id,
        name,
        avatar: "",
        type: DriveTypes.BojuCC,
        unique_id: unique_id,
        profile: JSON.stringify({ drive_id: unique_id, unique_id, name } as { unique_id: string; name: string }),
        root_folder_id: BOJUDriveClient.ROOT_ID,
        drive_token: {
          create: {
            id: r_id(),
            data: JSON.stringify({}),
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

  id = "";
  unique_id = "";
  token = "";
  root_folder: { id: string; name: string };

  $client: HttpClientCore;
  $store: DataStore;

  constructor(props: BOJUDriveClientProps) {
    const { id, unique_id, store } = props;

    this.id = id;
    this.unique_id = unique_id;
    this.$store = store;

    this.root_folder = {
      id: unique_id,
      name: "",
    };
    this.$client = new HttpClientCore({
      hostname: this.unique_id,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    connect(this.$client);
  }
  /** 获取剧集列表 */
  async fetch_files(
    /** 该文件夹下的文件列表，默认 root 表示根目录 */
    file_id: string = BOJUDriveClient.ROOT_ID,
    options: Partial<{
      /** 每页数量 */
      page_size: number;
      /** 下一页标志 */
      marker: string;
      sort: { field: "name" | "updated_at" | "size"; order: "asc" | "desc" }[];
    }> = {}
  ) {
    console.log("[]BOJU fetch_files", file_id, this.id);
    if (file_id === BOJUDriveClient.ROOT_ID) {
      const files = await this.$store.prisma.file.findMany({
        where: {
          parent_file_id: file_id,
          drive_id: this.id,
        },
      });
      return Result.Ok({
        items: files.map((f) => {
          return build_drive_file({
            type: "folder",
            file_id: f.file_id,
            name: f.name,
            parent_file_id: f.parent_file_id,
          });
        }),
        next_marker: "",
      });
    }
    if (!file_id.match(folder_re)) {
      return Result.Ok({
        items: [],
        next_marker: "",
      });
    }
    const r = await this.$client.get<string>(file_id, {});
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const html = r.data;
    const $ = load(html);
    const $list = $(".module-play-list-content a");
    return Result.Ok({
      items: Array.from($list).map((episode) => {
        // @ts-ignore
        const $$ = $(episode);
        const href = $$.attr("href");
        const title = $$.attr("title");
        const episode_name = $$.find("span").text();
        return build_drive_file({
          file_id: href!,
          type: "file",
          name: `${episode_name}.mp4`,
          parent_file_id: file_id,
          size: 0,
        });
      }),
      next_marker: "",
    });
  }
  /** 获取剧集详情 */
  async fetch_file(file_id: string) {
    console.log("[]clients/boju_cc fetch_file", file_id);
    const is_folder = file_id.match(folder_re);
    const r = await this.$client.get<string>(file_id, {});
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const html = r.data;
    console.log("[]clients/boju_cc fetch_file before load(html)");
    const $ = load(html);
    const $title = $(".module-info-heading h1");
    if (!$title) {
      return Result.Err("没有获取到名称");
    }
    const data = build_drive_file({
      file_id,
      name: $title.text(),
      type: is_folder ? "folder" : "file",
      size: 0,
      parent_file_id: (() => {
        if (is_folder) {
          return this.root_folder.id;
        }
        const m = file_id.match(file_re);
        if (!m) {
          return this.root_folder.id;
        }
        const [, parent] = m;
        return `/v/${parent}.html`;
      })(),
    });
    return Result.Ok(data);
  }
  async create_folder(params: { name: string; parent_file_id?: string }) {
    return Result.Err("not supported");
  }
  async upload(
    filepath: string,
    options: { name: string; parent_file_id?: string; drive_id?: string; on_progress?: (v: string) => void }
  ) {
    return Result.Err("not supported");
  }
  /** 获取指定文件内容 */
  async fetch_content(file_id: string) {
    return Result.Err("not supported");
  }
  get_parent_folder_id(parent_file_id?: string) {
    if (!parent_file_id) {
      return this.root_folder.id;
    }
    if (parent_file_id === BOJUDriveClient.ROOT_ID) {
      return this.root_folder.id;
    }
    return parent_file_id;
  }
  async fetch_parent_paths(file_id: string, type?: FileType) {
    if (file_id.match(folder_re)) {
      const r = await this.$store.prisma.file.findFirst({
        where: {
          file_id,
          drive_id: this.id,
        },
      });
      if (!r) {
        return Result.Err("该文件不存在");
      }
      return Result.Ok([
        {
          file_id: BOJUDriveClient.ROOT_ID,
          name: "root",
          parent_file_id: "",
          type: "folder",
        },
        {
          file_id: r.file_id,
          name: r.name,
          parent_file_id: r.parent_file_id,
          type: "folder",
        },
      ]);
    }
    return Result.Err("not supported");
  }
  async download(file_id: string) {
    return Result.Err("not supported");
  }
  async ping() {
    return Result.Err("请实现 ping 方法");
  }
  async refresh_profile() {
    return Result.Err("请实现 refresh_profile 方法");
  }
  async search_files() {
    return Result.Err("请实现 search_files 方法");
  }
  /** 获取剧集播放信息 */
  async existing(file_id: string, name: string) {
    console.log("[]clients/boju_cc - existing", file_id, name, file_id === BOJUDriveClient.ROOT_ID);
    if (file_id === BOJUDriveClient.ROOT_ID) {
      const file = await this.$store.prisma.file.findFirst({
        where: {
          type: FileType.Folder,
          name,
          parent_file_id: file_id,
          drive_id: this.id,
        },
      });
      if (!file) {
        return Result.Ok(null);
      }
      return Result.Ok(
        build_drive_file({
          file_id: file.file_id,
          name: file.name,
          parent_file_id: file.parent_file_id,
          type: file.type === FileType.Folder ? "folder" : "file",
        })
      );
    }
    return this.fetch_file(file_id);
  }
  async rename_file(file_id: string, name: string) {
    return Result.Err("not supported");
  }
  async delete_file(file_id: string) {
    return Result.Err("not supported");
  }
  /** 获取剧集播放信息 */
  // @ts-ignore
  async fetch_video_preview_info(file_id: string) {
    const r = await this.$client.get<string>(file_id, {});
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const html = r.data;
    const reg = /player_[a-z0-9 ]{1,}= {0,1}([^<]{1,})<\/script/;
    const matched = html.match(reg);
    if (!matched) {
      return Result.Err("没有找到视频地址");
    }
    const r2 = parseJSONStr<{ url: string }>(matched[1]);
    if (r2.error) {
      return Result.Err("解析视频地址失败");
    }
    return Result.Ok({
      sources: [
        {
          type: MediaResolutionTypes.HD,
          name: file_id,
          url: r2.data.url,
          width: 1980,
          height: 780,
          invalid: false,
        },
      ],
      subtitles: [],
    });
  }
  async fetch_video_preview_info_for_download() {
    return Result.Err("请实现 fetch_video_preview_info_for_download 方法");
  }
  async move_files_to_folder() {
    return Result.Err("请实现 move_files_to_folder 方法");
  }
  async fetch_share_profile() {
    return Result.Err("请实现 fetch_share_profile 方法");
  }
  async fetch_resource_files() {
    return Result.Err("请实现 fetch_shared_files 方法");
  }
  async fetch_shared_file() {
    return Result.Err("请实现 fetch_shared_file 方法");
  }
  async generate_thumbnail() {
    return Result.Err("请实现 generate_thumbnail 方法");
  }
  async search_shared_files() {
    return Result.Err("请实现 search_shared_files 方法");
  }
  async save_shared_files() {
    return Result.Err("请实现 save_shared_files 方法");
  }
  async save_multiple_shared_files() {
    return Result.Err("请实现 save_multiple_shared_files 方法");
  }
  async checked_in() {
    return Result.Err("请实现 checked_in 方法");
  }
  on_print() {
    return () => {};
  }
}
