/**
 * @file 一个阿里云文件夹
 */
import { Result } from "@/types";
import { sleep } from "@/utils/flow";
import { PartialAliyunDriveFile } from "@/domains/aliyundrive/types";

export class AliyunDriveFolder {
  /** 文件夹 id */
  file_id: string;
  /** 父文件夹 id */
  parent_file_id: string = "root";
  /** 文件夹名 */
  name: string = "";
  /** 类型 */
  type: "folder" = "folder";
  size: number = 0;
  /** 该文件夹的子文件/子文件夹 */
  items: (AliyunDriveFile | AliyunDriveFolder)[] = [];
  /** 该文件夹所在上下文 */
  parents: {
    file_id: string;
    name: string;
  }[] = [];
  /** 获取下一页的标志 */
  next_marker: string = "initial";
  cur_items: (AliyunDriveFile | AliyunDriveFolder)[] = [];
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
      client: AliyunDriveFolder["client"];
      parents?: { file_id: string; name: string }[];
    } = { client: null }
  ) {
    const { client, name, parents = [] } = options;
    if (name) {
      this.name = name;
    }
    this.parents = parents;
    this.file_id = id;
    this.client = client;
  }
  /** 获取并设置文件夹详情（名称等信息） */
  async profile() {
    if (this.client === null) {
      return Result.Err("缺少阿里云盘实例");
    }
    if (!this.client.fetch_file) {
      return Result.Err("云盘实例缺少 fetch_file 方法");
    }
    const r = await this.client.fetch_file(this.file_id);
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
  /** 获取该文件夹下的子文件夹，每次调用的结果不同，开始是第一页，然后是第二页 */
  async next() {
    if (this.client === null) {
      throw new Error("Missing AliyunDriveClient instance");
    }
    if (!this.name) {
      const r = await this.profile();
      if (r.error) {
        return r;
      }
    }
    if (this.delay) {
      await sleep(this.delay);
    }
    // console.log("before invoke fetch_files", this.file_id);
    if (this.next_marker === "") {
      return Result.Ok([]);
    }
    const r = await this.client.fetch_files(this.file_id, {
      marker: this.next_marker === "initial" ? "" : this.next_marker,
    });
    if (r.error) {
      return r;
    }
    const { items, next_marker } = r.data;
    this.next_marker = next_marker;
    const folder_or_files = items.map((f) => {
      const { type, file_id } = f;
      const parents = this.parents.concat({
        file_id: this.file_id,
        name: this.name,
      });
      if (type === "folder") {
        const folder = new AliyunDriveFolder(file_id, {
          client: this.client,
          parents,
        });
        folder.parent_file_id = this.file_id;
        folder.set_profile(f);
        return folder;
      }
      const file = new AliyunDriveFile(file_id, {
        client: this.client,
        parents,
      });
      file.parent_file_id = this.file_id;
      file.set_profile(f);
      return file;
    });
    this.cur_items = folder_or_files;
    this.items = this.items.concat(folder_or_files);
    return Result.Ok(this.cur_items);
  }
  set_delay(delay?: number) {
    this.delay = delay;
  }
  get parent_paths() {
    return this.parents.map((c) => c.name).join("/");
  }
}

export class AliyunDriveFile {
  /** 文件夹 id */
  file_id: string;
  /** 父文件夹 id */
  parent_file_id: string = "";
  /** 文件类型 */
  type: "file" = "file";
  /** 文件名称 */
  name: string = "";
  /** 文件大小（单位字节） */
  size: number = 0;
  parents: AliyunDriveFolder["parents"];
  /** 获取该文件信息的方法合集对象 */
  private client: AliyunDriveFolder["client"];
  constructor(
    id: string,
    options: {
      client: AliyunDriveFile["client"];
      parents: AliyunDriveFile["parents"];
    }
  ) {
    const { client, parents } = options;
    this.file_id = id;
    this.client = client;
    this.parents = parents;
  }
  set_profile(profile: PartialAliyunDriveFile) {
    const { name, size = 0 } = profile;
    this.name = name;
    this.size = size;
  }
  get parent_paths() {
    return this.parents.map((c) => c.name).join("/");
  }
}

export class AliyunDriveTree {}
