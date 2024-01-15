/**
 * @file 文件夹、文件
 */
import { BaseDomain, Handler } from "@/domains/base";
import { PartialAliyunDriveFile } from "@/domains/aliyundrive/types";
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
  md5?: string;
  mime_type?: string;
  size: number = 0;
  /** 该文件夹的子文件/子文件夹 */
  items: (File | Folder)[] = [];
  /** 该文件夹所在上下文 */
  parents: {
    id: string;
    name: string;
  }[] = [];
  /** 获取下一页的标志 */
  next_marker: string = "initial";
  cur_items: (File | Folder)[] = [];
  /** 每次请求间的间隔时间 */
  delay?: number;
  /** 获取该文件夹信息及子文件夹/文件的方法合集对象 */
  private client: {
    fetch_file?: (file_id: string) => Promise<Result<PartialAliyunDriveFile>>;
    fetch_files: (
      file_id: string,
      options: { marker?: string }
    ) => Promise<Result<{ items: PartialAliyunDriveFile[]; next_marker: string }>>;
  } | null;
  /**
   * @param id 文件夹 id
   * @param options.client 根据文件夹 id 获取文件夹详情，以及文件夹子内容的方法
   */
  constructor(
    id: string,
    options: {
      name?: string;
      client: Folder["client"];
      parents?: { id: string; name: string }[];
    } = { client: null }
  ) {
    super();

    this.id = id;
    const { client = null, name, parents = [] } = options;
    if (name) {
      this.name = name;
    }
    this.parents = parents;
    this.client = client;
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
  set_profile(profile: Partial<PartialAliyunDriveFile>) {
    const { name, size = 0 } = profile;
    if (!name) {
      return Result.Err("Missing name");
    }
    this.name = name;
    this.size = size;
    return Result.Ok(null);
  }
  /** 深度递归 */
  async walk(handler: (file: File | Folder) => Promise<boolean>, options: Partial<{ deep: boolean }> = { deep: true }) {
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
        if (!can_continue) {
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
          client: this.client,
          parents,
        });
        folder.parent_file_id = this.id;
        folder.set_profile(f);
        return folder;
      }
      const file = new File(file_id, {
        size,
        md5,
        client: this.client,
        parents,
      });
      file.parent_file_id = this.id;
      file.set_profile(f);
      return file;
    });
    this.cur_items = folder_or_files;
    this.items = this.items.concat(folder_or_files);
    return Result.Ok(folder_or_files);
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
  /** 文件夹 id */
  id: string;
  /** 父文件夹 id */
  parent_file_id: string = "";
  /** 文件类型 */
  type: "file" = "file";
  /** 文件名称 */
  name: string = "";
  /** 文件大小（单位字节） */
  size: number = 0;
  md5?: string;
  mime_type?: string;
  parents: Folder["parents"];
  /** 获取该文件信息的方法合集对象 */
  private client: Folder["client"];
  constructor(
    id: string,
    options: {
      name?: string;
      size?: number;
      md5?: string | null;
      client: File["client"];
      parents: File["parents"];
    }
  ) {
    const { size = 0, md5, client, parents } = options;
    this.id = id;
    this.size = size;
    if (md5) {
      this.md5 = md5;
    }
    this.client = client;
    this.parents = parents;
  }
  set_profile(profile: PartialAliyunDriveFile) {
    const { name, size = 0, content_hash, mime_type } = profile;
    this.name = name;
    this.size = size;
    this.md5 = content_hash;
    this.mime_type = mime_type;
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
