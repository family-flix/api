/**
 * @file 对比两次遍历文件夹的差异
 */
import {
  AliyunDriveFile,
  AliyunDriveFolder,
} from "@/domains/aliyundrive/folder";
import { log } from "@/logger/log";

export enum DiffTypes {
  /** 新增 */
  Adding,
  /** 删除 */
  Deleting,
  /** 修改 */
  Modify,
  /** 移动 */
  Moving,
}
/** 阿里云盘的操作 */
export type DifferEffect = {
  type: DiffTypes;
  payload: {
    file_id: string;
    parent_file_id?: string;
    name: string;
    type: "folder" | "file";
    context: {
      file_id: string;
      name: string;
    }[];
  };
};

export class FolderDiffer {
  folder: AliyunDriveFolder;
  prev_folder: AliyunDriveFolder;
  unique_key: "file_id" | "name";
  filter?: (file: AliyunDriveFile | AliyunDriveFolder) => boolean;
  /** 是否在对比子文件夹。该变量的目的在于保留不确定是新增还是移动的文件，放在最后回到根目录时再判断 */
  is_child = false;
  /** 收集到的变更 */
  effects: DifferEffect[] = [];
  /** 保存了一些还没有被处理的文件夹 */
  map: Record<string, AliyunDriveFolder | AliyunDriveFile> = {};
  /** 可能是新增的 */
  maybe_adding: Record<string, AliyunDriveFolder | AliyunDriveFile> = {};
  /** 可能是删除的 */
  maybe_deleting: Record<string, AliyunDriveFolder | AliyunDriveFile> = {};

  constructor(options: {
    /** 要比较的最新文件夹 id */
    folder: AliyunDriveFolder;
    prev_folder: AliyunDriveFolder;
    /** 判断两个文件是否相同的键 */
    unique_key: "file_id" | "name";
    /** 是否忽略 */
    filter?: FolderDiffer["filter"];
  }) {
    const { folder, prev_folder, unique_key, filter } = options;
    this.folder = folder;
    this.prev_folder = prev_folder;
    this.unique_key = unique_key;
    if (filter) {
      this.filter = filter;
    }
  }
  async run() {
    log(
      "[DOMAIN](FolderDiffer)run",
      this.prev_folder.name,
      this.folder.name,
      this.is_child
    );
    const r1 = await this.folder.next();
    if (r1.error) {
      log("folder next failed", r1.error.message);
      return;
    }
    const r2 = await this.prev_folder.next();
    if (r2.error) {
      log("prev folder next failed", r2.error.message);
      return;
    }
    const cur_files = r1.data.filter((f) => {
      if (this.filter) {
        return this.filter(f);
      }
      return true;
    });
    const prev_files = r2.data.filter((f) => {
      if (this.filter) {
        return this.filter(f);
      }
      return true;
    });
    log(
      "[DOMAIN](FolderDiffer)prev files and cur files",
      prev_files.map((f) => f.name),
      cur_files.map((f) => f.name),
      Object.keys(this.maybe_deleting),
      Object.keys(this.maybe_adding)
    );
    // log("[DOMAIN](FolderDiffer)effect length", this.effects.length);
    if (r1.data.length === 0 && r2.data.length === 0) {
      const is_root_folder = !this.is_child;
      // 这里 r1.data.length === 0 && r2.data.length === 0 才表示真的没有数据了，cur_files.length 可能是过滤后没有数据了
      if (is_root_folder) {
        const deleting_actions = Object.keys(this.maybe_deleting).map(
          (unique_key) => {
            const { file_id, parent_file_id, name, type, context } =
              this.maybe_deleting[unique_key];
            log("[DOMAIN](FolderDiffer)must be deleting", name);
            return {
              type: DiffTypes.Deleting,
              payload: {
                file_id,
                parent_file_id,
                name,
                type,
                context,
              },
            };
          }
        );
        this.effects.push(...deleting_actions);
        const adding_actions = Object.keys(this.maybe_adding).map(
          (unique_key) => {
            const { file_id, name, type, parent_file_id, context } =
              this.maybe_adding[unique_key];
            log("[DOMAIN](FolderDiffer)must be adding", name);
            return {
              type: DiffTypes.Adding,
              payload: {
                file_id,
                parent_file_id,
                name,
                type,
                context,
              },
            };
          }
        );
        this.effects.push(...adding_actions);
      }
      log("[DOMAIN](FolderDiffer)ended");
      return;
    }
    if (prev_files.length === 0 && cur_files.length !== 0) {
      // log("cur length longer", cur_files.length, prev_files.length);
      let map: Record<string, AliyunDriveFolder | AliyunDriveFile> =
        cur_files.reduce((prev, next) => {
          const unique_key = next.context
            .map((f) => f[this.unique_key])
            .concat(next[this.unique_key])
            .join("/");
          return {
            ...prev,
            [unique_key]: next,
          };
        }, {});
      for (let i = 0; i < cur_files.length; i += 1) {
        const cur_file = cur_files[i];
        const unique_key = cur_file.context
          .map((f) => f[this.unique_key])
          .concat(cur_file[this.unique_key])
          .join("/");
        // 这里的目的是，新文件夹的数量多余旧文件夹，新文件夹的第二页其实就是旧文件夹的第一页，所以要从之前将旧文件夹猜测为删除的
        // 在这里做一次判断，既避免了多删除，也避免了多添加
        // log("[DOMAIN](FolderDiffer)", v, this.maybe_deleting);
        if (this.maybe_deleting[unique_key]) {
          log(
            "[DOMAIN](FolderDiffer)existing maybe deleting, so delete it",
            this.maybe_deleting[unique_key].name
          );
          delete this.maybe_deleting[unique_key];
          delete map[unique_key];
        }
      }
      this.maybe_adding = {
        ...this.maybe_adding,
        ...map,
      };
      await this.run();
      return;
    }
    if (prev_files.length !== 0 && cur_files.length === 0) {
      const map = prev_files
        .map((file) => {
          const unique_key = file.context
            .map((f) => f[this.unique_key])
            .concat(file[this.unique_key])
            .join("/");
          return {
            [unique_key]: file,
          };
        })
        .reduce((total, c) => {
          return {
            ...total,
            ...c,
          };
        }, {});
      for (let i = 0; i < prev_files.length; i += 1) {
        const prev_file = prev_files[i];
        const unique_key = prev_file.context
          .map((f) => f[this.unique_key])
          .concat(prev_file[this.unique_key])
          .join("/");
        if (this.maybe_adding[unique_key]) {
          log(
            "[DOMAIN](FolderDiffer)existing maybe adding, so delete it",
            this.maybe_adding[unique_key].name
          );
          delete this.maybe_adding[unique_key];
          delete map[unique_key];
        }
      }
      this.maybe_deleting = {
        ...this.maybe_deleting,
        ...map,
      };
      await this.run();
      return;
    }
    const prev_maybe_adding = Object.keys(this.maybe_adding).map((k) => {
      return this.maybe_adding[k];
    });
    this.maybe_adding = {};
    const cur_files_with_prev_maybe_adding_files = [
      ...prev_maybe_adding.concat(cur_files),
    ];
    const prev_maybe_deleting = Object.keys(this.maybe_deleting).map((k) => {
      return this.maybe_deleting[k];
    });
    this.maybe_deleting = {};
    const prev_files_with_prev_maybe_deleting_files = [
      ...prev_maybe_deleting.concat(prev_files),
    ];
    let i = 0;
    // 大部分情况都会走这里，先遍历旧的
    for (; i < prev_files_with_prev_maybe_deleting_files.length; i += 1) {
      // 如果在同一个位置上，新的列表没有值了，说明啥？
      if (cur_files_with_prev_maybe_adding_files[i] === undefined) {
        break;
      }
      // 在同一个位置上有值，对比这两个
      const cur_file = cur_files_with_prev_maybe_adding_files[i];
      // const cur_unique = cur_file[this.unique_key];
      const cur_unique = cur_file.context
        .map((f) => f[this.unique_key])
        .concat(cur_file[this.unique_key])
        .join("/");
      const prev_file = prev_files_with_prev_maybe_deleting_files[i];
      // const prev_unique = prev_file[this.unique_key];
      const prev_unique = prev_file.context
        .map((f) => f[this.unique_key])
        .concat(prev_file[this.unique_key])
        .join("/");
      log("[DOMAIN](FolderDiffer)1.0 - compare", cur_file.name, prev_file.name);
      if (cur_unique === prev_unique) {
        // file_id 相同，看看名字是否还相同，不相同就是「仅修改名称」
        // if (name !== cur_name) {
        //   // console.log("[]()1.1 - is modify", name);
        //   if (this.maybe_adding[cur_unique]) {
        //     delete this.maybe_adding[cur_unique];
        //   }
        //   this.effect.push({
        //     type: DiffTypes.Modify,
        //     payload: {
        //       file_id,
        //       type,
        //       name: cur_name,
        //     },
        //   });
        // }
        log(
          "[DOMAIN](FolderDiffer)1.1 - is same, check is folder then compare sub files",
          cur_unique,
          prev_unique
        );
        if (cur_file.type === "folder" && prev_file.type === "folder") {
          const sub_diff = new FolderDiffer({
            prev_folder: prev_file as AliyunDriveFolder,
            folder: cur_file as AliyunDriveFolder,
            unique_key: this.unique_key,
            filter: this.filter,
          });
          sub_diff.is_child = true;
          await sub_diff.run();
          this.maybe_deleting = {
            ...this.maybe_deleting,
            ...sub_diff.maybe_deleting,
          };
          this.maybe_adding = {
            ...this.maybe_adding,
            ...sub_diff.maybe_adding,
          };
          this.effects = this.effects.concat(sub_diff.effects);
        }
        continue;
      }
      log("[DOMAIN](FolderDiffer)1.3 - not same, so break");
      break;
    }
    // 剩下的旧文件夹以 id 作为 key 变成对象
    const remaining_files = prev_files_with_prev_maybe_deleting_files.slice(i);
    const map: Record<string, AliyunDriveFolder | AliyunDriveFile> =
      remaining_files.reduce((prev, next) => {
        const unique_key = next.context
          .map((f) => f[this.unique_key])
          .concat(next[this.unique_key])
          .join("/");
        return {
          ...prev,
          [unique_key]: next,
        };
      }, {});
    // log("after map, remaining map", map, i, remaining_files);
    // 遍历新的，和上面 this.map 做对比
    for (let j = i; j < cur_files_with_prev_maybe_adding_files.length; j += 1) {
      const cur_file = cur_files_with_prev_maybe_adding_files[j];
      // const prev_file = prev_files_with_prev_maybe_deleting_files[j];
      // log("[]()walk remaining files", j, file);
      const unique_key = cur_file.context
        .map((f) => f[this.unique_key])
        .concat(cur_file[this.unique_key])
        .join("/");
      // 当前这个文件在之前的文件列表也存在
      if (map[unique_key]) {
        // 看看名字是否相同，如果不同就是「仅修改名称」
        // log("[DOMAIN](FolderDiffer)2.0 - has same id", name, this.map[v].name);
        // if (this.map[v][this.unique_key] !== cur_files[j][this.unique_key]) {
        //   log("[DOMAIN](FolderDiffer)2.1 - is modify", name);
        //   this.effects.push({
        //     type: DiffTypes.Modify,
        //     payload: {
        //       file_id,
        //       type,
        //       name,
        //       context,
        //     },
        //   });
        // }
        log(
          `[DOMAIN](FolderDiffer)2.3 - ${cur_file.name} and ${map[unique_key].name} is same, so no change`
        );
        if (cur_file.type === "folder" && map[unique_key].type === "folder") {
          const sub_diff = new FolderDiffer({
            prev_folder: map[unique_key] as AliyunDriveFolder,
            folder: cur_file as AliyunDriveFolder,
            unique_key: this.unique_key,
            filter: this.filter,
          });
          sub_diff.is_child = true;
          await sub_diff.run();
          this.maybe_deleting = {
            ...this.maybe_deleting,
            ...sub_diff.maybe_deleting,
          };
          this.maybe_adding = {
            ...this.maybe_adding,
            ...sub_diff.maybe_adding,
          };
          this.effects = this.effects.concat(sub_diff.effects);
        }
        if (this.maybe_adding[unique_key]) {
          log(
            "[DOMAIN](FolderDiffer)existing maybe adding, so delete it",
            this.maybe_adding[unique_key].name
          );
          delete this.maybe_adding[unique_key];
        }
        delete map[unique_key];
        continue;
      }
      log(
        "[DOMAIN](FolderDiffer)3.0 - no same id, maybe adding",
        cur_file.name
      );
      // 这里会重复添加，但是用 v 做 key 所以实际上没有重复添加成功
      this.maybe_adding[unique_key] = cur_file;
    }
    log(
      "[DOMAIN](FolderDiffer)4.0 - maybe adding",
      Object.keys(this.maybe_adding).map((k) => {
        return this.maybe_adding[k].name;
      })
    );
    // Object.keys(this.map).map((id) => {
    //   log("[DOMAIN](FolderDiffer)4.0 - maybe deleting", this.map[id].name);
    // });
    this.maybe_deleting = {
      ...map,
    };
    log(
      "[DOMAIN](FolderDiffer)4.0 - maybe deleting",
      Object.keys(this.maybe_deleting).map((k) => {
        return this.maybe_deleting[k].name;
      })
    );
    await this.run();
  }
}
