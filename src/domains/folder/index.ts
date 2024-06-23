/**
 * @file 文件夹、文件
 */
import { BaseDomain, Handler } from "@/domains/base";
import { GenreDriveFile } from "@/domains/clients/types";
import { DriveClient } from "@/domains/clients/types";
import { Result } from "@/types";
import { sleep } from "@/utils";

enum Events {
  File,
  Error,
}
type TheTypesOfEvents = {
  [Events.File]: {};
  [Events.Error]: Error;
};
type ParentFolder = { id: string; name: string };
type ArchivedEpisode = {
  file_id: string;
  file_name: string;
  file_path: string;
  name: string;
  original_name: string;
  season?: string;
  episode?: string;
};
type ArchivedMovie = {
  file_id: string;
  file_name: string;
  file_path: string;
  name: string;
  original_name: string;
};
type PendingFile = {
  file_id: string;
  name: string;
  parent_paths: string;
  type: "subtitle" | "img" | "nfo";
};

export class Folder extends BaseDomain<TheTypesOfEvents> {
  /** 文件夹 id */
  id: string;
  /** 父文件夹 id */
  parent_file_id: string = "root";
  /** 文件夹名 */
  name: string = "";
  /** 类型 */
  type: "folder" = "folder";
  /** 其实是没有的，只是为了 Folder 和 File 的参数一致 */
  md5: string | null = null;
  mime_type: string | null = null;
  size: number = 0;
  /** 该文件夹的子文件/子文件夹 */
  items: (File | Folder)[] = [];
  /** 该文件夹父文件夹 */
  parents: {
    id: string;
    name: string;
  }[] = [];
  /** 获取下一页的标志 */
  next_marker: string = "initial";
  cur_items: (File | Folder)[] = [];
  /** 每次请求间的间隔时间 */
  delay?: number;
  /** 该文件夹解析出的剧集列表 */
  episodes: ArchivedEpisode[] = [];
  movies: ArchivedEpisode[] = [];
  /** 该文件夹内和「影视剧」相关的文件，如字幕、封面、nfo 文件等 */
  relative_files: PendingFile[] = [];
  /**
   * 索引过程只有根文件夹可以保存 episodes；假设索引 medias 文件夹
   * - medias
   *    - 请回答1998（2015）
   *      - S01
   *    - L 零号追杀.2023
   *
   * 只有 请回答1998（2015） 和 L 零号追杀.2023 两个文件夹可以保持 episodes。S01 不行
   * 这样当索引完 请回答1998（2015） 后可以将 episodes 清空，释放一些内存？
   */
  can_save_episode = false;

  parent: Folder | null = null;
  /** 获取该文件夹信息及子文件夹/文件的方法合集对象 */
  client: DriveClient;

  /**
   * @param id 文件夹 id
   * @param options.client 根据文件夹 id 获取文件夹详情，以及文件夹子内容的方法
   */
  constructor(
    id: string,
    props: {
      name?: string;
      parents?: ParentFolder[];
      parent?: Folder;
      client: DriveClient;
    }
  ) {
    super();

    this.id = id;
    const { name, parents = [], parent = null, client } = props;
    if (name) {
      this.name = name;
    }
    this.client = client;
    this.parent = parent;
    this.parents = parents;
  }
  get parent_paths() {
    return this.parents.map((c) => c.name).join("/");
  }
  /** 获取并设置文件夹详情（名称等信息） */
  async profile() {
    if (this.client === null) {
      return Result.Err("缺少阿里云盘实例");
    }
    if (!this.client.fetch_file) {
      return Result.Err("云盘实例缺少 fetch_file 方法");
    }
    const r = await this.client.fetch_file(this.id);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { name, parent_file_id } = r.data;
    this.name = name;
    this.parent_file_id = parent_file_id;
    return Result.Ok(r.data);
  }
  /** 设置文件夹详情（名称等信息） */
  set_profile(profile: Partial<GenreDriveFile>) {
    const { name, size = 0 } = profile;
    if (!name) {
      return Result.Err("缺少 'name' 字段");
    }
    this.name = name;
    this.size = size;
    return Result.Ok(null);
  }
  /**
   * 深度递归
   * 第一个 handler 参数返回 false 表示终止递归
   */
  async walk(
    handler: (file: File | Folder) => Promise<void | boolean>,
    options: Partial<{ deep: boolean }> = { deep: true }
  ) {
    if (this.client === null) {
      return Result.Err("缺少云盘操作实例");
    }
    if (!this.name) {
      const r = await this.profile();
      if (r.error) {
        return Result.Err(r.error.message);
      }
    }
    do {
      const r = await this.next();
      if (r.error) {
        console.log(r.error.message);
        continue;
      }
      for (let i = 0; i < r.data.length; i += 1) {
        const file = r.data[i];
        const can_continue = await handler(file);
        if (can_continue === false) {
          return Result.Ok(null);
        }
        if (file instanceof Folder && options.deep) {
          await file.walk(handler);
        }
      }
    } while (this.next_marker);
    return Result.Ok(null);
  }
  /** 获取该文件夹下的子文件夹，每次调用的结果不同，开始是第一页，然后是第二页 */
  async next() {
    if (this.client === null) {
      throw new Error("Missing AliyunDriveClient instance");
    }
    if (!this.name) {
      const r = await this.profile();
      if (r.error) {
        return Result.Err(r.error.message);
      }
    }
    if (this.delay) {
      await sleep(this.delay);
    }
    // console.log("before invoke fetch_files", this.file_id);
    if (this.next_marker === "") {
      return Result.Ok([]);
    }
    const r = await this.client.fetch_files(this.id, {
      marker: this.next_marker === "initial" ? "" : this.next_marker,
    });
    if (r.error) {
      this.emit(Events.Error, r.error);
      return Result.Err(r.error);
    }
    const { items, next_marker } = r.data;
    this.next_marker = next_marker;
    const folder_or_files = items.map((f) => {
      const { type, file_id, size, md5 } = f;
      const parents = this.parents.concat({
        id: this.id,
        name: this.name,
      });
      if (type === "folder") {
        const folder = new Folder(file_id, {
          parents,
          parent: this,
          client: this.client,
        });
        folder.parent_file_id = this.id;
        folder.set_profile(f);
        return folder;
      }
      const file = new File(file_id, {
        size,
        md5,
        parents,
        parent: this,
        client: this.client,
      });
      file.parent_file_id = this.id;
      file.set_profile(f);
      return file;
    });
    this.cur_items = folder_or_files;
    this.items = this.items.concat(folder_or_files);
    return Result.Ok(folder_or_files);
  }
  push_episodes(episodes: ArchivedEpisode[]) {
    // console.log("folder push episode", this.name, this.can_save_episode, this.parent?.name, episode.file_name);
    this.episodes.push(...episodes);
  }
  up_episodes() {
    if (this.parent) {
      this.parent.push_episodes(this.episodes);
    }
    this.episodes = [];
  }
  clear_episodes() {
    this.episodes = [];
  }
  push_movie(movies: ArchivedEpisode[]) {
    this.movies.push(...movies);
  }
  up_movie() {
    if (this.parent) {
      this.parent.push_movie(this.movies);
    }
    this.movies = [];
  }
  clear_movie() {
    this.movies = [];
  }
  push_relative_files(files: PendingFile[]) {
    // console.log("folder push relative file", this.name, this.parent?.name, file.name, this.can_save_episode);
    this.relative_files.push(...files);
  }
  up_relative_files() {
    if (this.parent) {
      this.parent.push_relative_files(this.relative_files);
    }
    this.relative_files = [];
  }
  clear_relative_files() {
    this.relative_files = [];
  }
  set_can_save_episode() {
    // console.log("set_can_save_episode", this.name);
    this.can_save_episode = true;
  }
  set_delay(delay?: number) {
    this.delay = delay;
  }
  to_json() {
    return {
      id: this.id,
      name: this.name,
      parent_paths: this.parent_paths,
    };
  }

  on_file(handler: Handler<TheTypesOfEvents[Events.File]>) {
    return this.on(Events.File, handler);
  }
}

export class File {
  /** 文件 id */
  id: string;
  /** 父文件夹 id */
  parent_file_id: string = "";
  /** 文件类型 */
  type: "file" = "file";
  /** 文件名称 */
  name: string = "";
  /** 文件大小（单位字节） */
  size: number = 0;
  md5: string | null = null;
  mime_type: string | null = null;
  parents: ParentFolder[] = [];

  parent: Folder | null = null;
  client: DriveClient;

  constructor(
    id: string,
    props: {
      name?: string;
      size?: number;
      md5?: string | null;
      parents: ParentFolder[];
      parent: Folder | null;
      client: DriveClient;
    }
  ) {
    const { size = 0, md5, parents, parent, client } = props;
    this.id = id;
    this.size = size;
    if (md5) {
      this.md5 = md5;
    }
    this.parents = parents;
    this.parent = parent;
    this.client = client;
  }
  set_profile(profile: { name: string; size: number; content_hash: string | null; mime_type: string | null }) {
    const { name, size = 0, content_hash = null, mime_type = null } = profile;
    this.name = name;
    this.size = size;
    this.md5 = content_hash;
    this.mime_type = mime_type;
  }
  push_episodes(episodes: ArchivedEpisode[]) {
    // console.log("file push episode", this.name, this.parent?.name, episode.file_name);
    if (!this.parent) {
      return;
    }
    this.parent.push_episodes(episodes);
  }
  push_movies(movies: ArchivedMovie[]) {
    // console.log("file push episode", this.name, this.parent?.name, episode.file_name);
    if (!this.parent) {
      return;
    }
    this.parent.push_movie(movies);
  }
  push_relative_files(files: PendingFile[]) {
    // console.log("file push relative file", this.name, this.parent?.name, file.name);
    if (!this.parent) {
      return;
    }
    this.parent.push_relative_files(files);
  }
  to_json() {
    return {
      id: this.id,
      name: this.name,
      parent_paths: this.parent_paths,
    };
  }
  get parent_paths() {
    return this.parents.map((c) => c.name).join("/");
  }
}

export class AliyunDriveTree {}
