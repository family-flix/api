/**
 * @file 对比两个文件夹的差异
 */
import { Handler } from "mitt";

import { AliyunDriveFile, AliyunDriveFolder } from "@/domains/folder";
import { ArticleLineNode, ArticleListItemNode, ArticleListNode, ArticleTextNode } from "@/domains/article";
import { BaseDomain } from "@/domains/base";

export enum DiffTypes {
  /** 新增 */
  Adding = 0,
  /** 删除 */
  Deleting = 1,
  /** 修改 */
  Modify = 2,
  /** 移动 */
  Moving = 3,
}
/** 文件的操作 */
export type DifferEffect = {
  type: DiffTypes;
  payload: {
    file_id: string;
    parent_file_id?: string;
    name: string;
    type: "folder" | "file";
    parents: {
      file_id: string;
      name: string;
    }[];
    prev_folder: {
      file_id: string;
      name: string;
    };
  };
};
type MaybeActionPayload = Record<
  string,
  {
    file: AliyunDriveFolder | AliyunDriveFile;
    prev_folder: AliyunDriveFolder;
  }
>;
enum Events {
  Print,
}
type TheTypesOfEvents = {
  [Events.Print]: ArticleLineNode;
};
type FolderDifferProps = {
  /** 要对比的新文件夹实例 */
  folder: AliyunDriveFolder;
  /** 要对比的旧文件夹实例 */
  prev_folder: AliyunDriveFolder;
  /** 判断两个文件是否相同的键 */
  unique_key: "file_id" | "name";
  /** 判断是否忽略 */
  filter?: (file: AliyunDriveFile | AliyunDriveFolder) => boolean;
  on_print?: (node: ArticleLineNode) => void;
};

export class FolderDiffer extends BaseDomain<TheTypesOfEvents> {
  folder: AliyunDriveFolder;
  // parent_folders: AliyunDriveFolder[] = [];
  prev_folder: AliyunDriveFolder;
  // prev_parent_folders: AliyunDriveFolder[] = [];
  unique_key: "file_id" | "name";
  filter?: FolderDifferProps["filter"];
  /** 是否在对比子文件夹。该变量的目的在于保留不确定是新增还是移动的文件，放在最后回到根目录时再判断 */
  is_child = false;
  /** 收集到的变更 */
  effects: DifferEffect[] = [];
  /** 保存了一些还没有被处理的文件夹 */
  map: MaybeActionPayload = {};
  /** 可能是新增的 */
  maybe_adding: MaybeActionPayload = {};
  /** 可能是删除的 */
  maybe_deleting: MaybeActionPayload = {};
  // article: Article;

  constructor(options: FolderDifferProps) {
    super();

    const { folder, prev_folder, unique_key, filter, on_print } = options;
    this.folder = folder;
    this.prev_folder = prev_folder;
    this.unique_key = unique_key;
    // this.article = new Article();
    if (filter) {
      this.filter = filter;
    }
    if (on_print) {
      this.on_print(on_print);
    }
  }
  async run(parent_prefix: string = "", is_next_page = false) {
    const prefix = `${parent_prefix}[${this.prev_folder.name}|${this.folder.name}]`;
    // log(prefix, is_next_page ? "继续" : "开始", "对比", this.prev_folder.name, "和", this.folder.name);
    // const a = parent_prefix ? parent_prefix : "";
    // log("[DOMAIN](FolderDiffer)run", this.prev_folder.name, this.folder.name, this.is_child);
    const r1 = await this.folder.next();
    if (r1.error) {
      // log(prefix, "获取新文件列表失败", r1.error.message);
      // log("folder next failed", r1.error.message);
      return;
    }
    const r2 = await this.prev_folder.next();
    if (r2.error) {
      // log(prefix, "获取旧文件列表失败", r2.error.message);
      // log("prev folder next failed", r2.error.message);
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
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: [
          new ArticleTextNode({
            text: "开始对比文件列表",
          }),
        ],
      })
    );
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: [
          new ArticleListNode({
            children: prev_files.map((f) => {
              return new ArticleListItemNode({
                children: [
                  new ArticleTextNode({
                    text: f.name,
                  }),
                ],
              });
            }),
          }),
        ],
      })
    );
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: [
          new ArticleListNode({
            children: cur_files.map((f) => {
              return new ArticleListItemNode({
                children: [
                  new ArticleTextNode({
                    text: f.name,
                  }),
                ],
              });
            }),
          }),
        ],
      })
    );
    // log(
    //   prefix,
    //   "需要对比的文件列表",
    //   prev_files.map((f) => f.name),
    //   cur_files.map((f) => f.name)
    // );
    // log("[DOMAIN](FolderDiffer)effect length", this.effects.length);
    if (r1.data.length === 0 && r2.data.length === 0) {
      const is_root_folder = !this.is_child;
      // 这里 r1.data.length === 0 && r2.data.length === 0 才表示真的没有数据了，cur_files.length 可能是过滤后没有数据了
      if (is_root_folder) {
        // log(prefix, "完成对比，获取新增与删除的文件列表");
        const deleting_actions = Object.keys(this.maybe_deleting).map((unique_key) => {
          const { file_id, parent_file_id, name, type, parents } = this.maybe_deleting[unique_key].file;
          // log("[DOMAIN](FolderDiffer)must be deleting", name);
          // log(prefix, "删除的文件", name);
          const r = {
            type: DiffTypes.Deleting,
            payload: {
              file_id,
              parent_file_id,
              name,
              type,
              parents,
              // prev_folder: {
              //   file_id: this.maybe_adding[unique_key].prev_folder.file_id,
              //   name: this.maybe_adding[unique_key].prev_folder.name,
              // },
            },
          } as DifferEffect;
          return r;
        });
        this.effects.push(...deleting_actions);
        const adding_actions = Object.keys(this.maybe_adding).map((unique_key) => {
          const { file_id, name, type, parent_file_id, parents } = this.maybe_adding[unique_key].file;
          const prev_folder = this.maybe_adding[unique_key].prev_folder;
          // log(prefix, "新增的文件", name, "应该添加到", prev_folder.name, "文件夹中");
          // log("[DOMAIN](FolderDiffer)must be adding", name);
          const r = {
            type: DiffTypes.Adding,
            payload: {
              file_id,
              parent_file_id,
              name,
              type,
              parents,
              prev_folder: {
                file_id: prev_folder.file_id,
                name: prev_folder.name,
              },
            },
          };
          return r as DifferEffect;
        });
        if (deleting_actions.length + adding_actions.length === 0) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: "完成对比，没有新增或删除文件",
                }),
              ],
            })
          );
          return;
        }
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: "完成对比，新增和删除的文件如下",
              }),
            ],
          })
        );
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: "删除了如下文件",
              }),
            ],
          })
        );
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [
              new ArticleListNode({
                children: deleting_actions.map((f) => {
                  return new ArticleListItemNode({
                    children: [
                      new ArticleTextNode({
                        text: `${f.payload.parents.map((p) => p.name).join("/")}/${f.payload.name}`,
                      }),
                    ],
                  });
                }),
              }),
            ],
          })
        );
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: "新增了如下文件",
              }),
            ],
          })
        );
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [
              new ArticleListNode({
                children: adding_actions.map((f) => {
                  return new ArticleListItemNode({
                    children: [
                      new ArticleTextNode({
                        text: `${f.payload.parents.map((p) => p.name).join("/")}/${f.payload.name}`,
                      }),
                    ],
                  });
                }),
              }),
            ],
          })
        );
        this.effects.push(...adding_actions);
      }
      // log("[DOMAIN](FolderDiffer)ended");
      // log(prefix, "结束对比");
      return;
    }
    if (prev_files.length === 0 && cur_files.length !== 0) {
      // log("cur length longer", cur_files.length, prev_files.length);
      let map: MaybeActionPayload = cur_files
        .map((file) => {
          const unique_key = file.parents
            .map((f) => f[this.unique_key])
            .concat(file[this.unique_key])
            .join("/");
          // log(prefix, "认为可能是新增的文件", file.name, this.prev_folder.name);
          return {
            [unique_key]: {
              file,
              prev_folder: this.prev_folder,
            },
          } as MaybeActionPayload;
        })
        .reduce((total, c) => {
          return {
            ...total,
            ...c,
          };
        }, {});
      for (let i = 0; i < cur_files.length; i += 1) {
        const cur_file = cur_files[i];
        const unique_key = cur_file.parents
          .map((f) => f[this.unique_key])
          .concat(cur_file[this.unique_key])
          .join("/");
        // 这里的目的是，新文件夹的数量多余旧文件夹，新文件夹的第二页其实就是旧文件夹的第一页，所以要从之前将旧文件夹猜测为删除的
        // 在这里做一次判断，既避免了多删除，也避免了多添加
        // log("[DOMAIN](FolderDiffer)", v, this.maybe_deleting);
        if (this.maybe_deleting[unique_key]) {
          // log(prefix, "文件存在可能删除的列表中，将其移除", this.maybe_deleting[unique_key].file.name);
          // log("[DOMAIN](FolderDiffer)existing maybe deleting, so delete it", this.maybe_deleting[unique_key].name);
          delete this.maybe_deleting[unique_key];
          delete map[unique_key];
        }
      }
      this.maybe_adding = {
        ...this.maybe_adding,
        ...map,
      };
      await this.run(parent_prefix, true);
      return;
    }
    if (prev_files.length !== 0 && cur_files.length === 0) {
      const map: MaybeActionPayload = prev_files
        .map((file) => {
          const unique_key = file.parents
            .map((f) => f[this.unique_key])
            .concat(file[this.unique_key])
            .join("/");
          // log(prefix, "认为可能是删除的文件", file.name);
          return {
            [unique_key]: {
              file,
              prev_folder: this.prev_folder,
            },
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
        const unique_key = prev_file.parents
          .map((f) => f[this.unique_key])
          .concat(prev_file[this.unique_key])
          .join("/");
        if (this.maybe_adding[unique_key]) {
          // log("[DOMAIN](FolderDiffer)existing maybe adding, so delete it", this.maybe_adding[unique_key].name);
          // log(prefix, "文件同时还在可能新增的列表中，将其移除", this.maybe_adding[unique_key].file.name);
          delete this.maybe_adding[unique_key];
          delete map[unique_key];
        }
      }
      this.maybe_deleting = {
        ...this.maybe_deleting,
        ...map,
      };
      await this.run(parent_prefix, true);
      return;
    }
    const prev_maybe_adding = Object.keys(this.maybe_adding).map((k) => {
      return this.maybe_adding[k].file;
    });
    this.maybe_adding = {};
    const cur_files_with_prev_maybe_adding_files = [...prev_maybe_adding.concat(cur_files)];
    const prev_maybe_deleting = Object.keys(this.maybe_deleting).map((k) => {
      return this.maybe_deleting[k].file;
    });
    this.maybe_deleting = {};
    const prev_files_with_prev_maybe_deleting_files = [...prev_maybe_deleting.concat(prev_files)];
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
      const cur_unique = cur_file.parents
        .map((f) => f[this.unique_key])
        .concat(cur_file[this.unique_key])
        .join("/");
      const prev_file = prev_files_with_prev_maybe_deleting_files[i];
      // const prev_unique = prev_file[this.unique_key];
      const prev_unique = prev_file.parents
        .map((f) => f[this.unique_key])
        .concat(prev_file[this.unique_key])
        .join("/");
      // log("[DOMAIN](FolderDiffer)1.0 - compare", cur_file.name, prev_file.name);
      // log(prefix, "对比两个文件是否相同", cur_file.name, prev_file.name);
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
        // log(prefix, "两个文件相同");
        // log("[DOMAIN](FolderDiffer)1.1 - is same, check is folder then compare sub files", cur_unique, prev_unique);
        if (cur_file.type === "folder" && prev_file.type === "folder") {
          const sub_diff = new FolderDiffer({
            prev_folder: prev_file as AliyunDriveFolder,
            folder: cur_file as AliyunDriveFolder,
            unique_key: this.unique_key,
            filter: this.filter,
            on_print: (node) => {
              this.emit(Events.Print, node);
            },
          });
          // sub_diff.parent_folders = this.parent_folders.concat(cur_file);
          // sub_diff.prev_parent_folders = this.prev_parent_folders.concat(prev_file);
          sub_diff.is_child = true;
          // log(prefix, "继续对比子文件1");
          await sub_diff.run(prefix);
          // log(
          //   prefix,
          //   "完成子文件",
          //   prev_file.name,
          //   "和",
          //   cur_file.name,
          //   "对比",
          //   Object.keys(sub_diff.maybe_deleting).length,
          //   "个可能删除",
          //   Object.keys(sub_diff.maybe_adding).length,
          //   "个可能新增"
          // );
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
      // log("[DOMAIN](FolderDiffer)1.3 - not same, so break");
      break;
    }
    // 剩下的旧文件夹以 id 作为 key 变成对象
    const remaining_files = prev_files_with_prev_maybe_deleting_files.slice(i);
    const map: MaybeActionPayload = remaining_files
      .map((file) => {
        const unique_key = file.parents
          .map((f) => f[this.unique_key])
          .concat(file[this.unique_key])
          .join("/");
        return {
          [unique_key]: {
            file,
            prev_folder: this.prev_folder,
          },
        };
      })
      .reduce((total, c) => {
        return {
          ...total,
          ...c,
        };
      }, {});
    // log("after map, remaining map", map, i, remaining_files);
    // 遍历新的，和上面 this.map 做对比
    for (let j = i; j < cur_files_with_prev_maybe_adding_files.length; j += 1) {
      const cur_file = cur_files_with_prev_maybe_adding_files[j];
      // const prev_file = prev_files_with_prev_maybe_deleting_files[j];
      // log("[]()walk remaining files", j, file);
      const unique_key = cur_file.parents
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
        // log(prefix, "两个文件没有变化");
        // log(`[DOMAIN](FolderDiffer)2.3 - ${cur_file.name} and ${map[unique_key].name} is same, so no change`);
        if (cur_file.type === "folder" && map[unique_key].file.type === "folder") {
          const prev_file = map[unique_key].file as AliyunDriveFolder;
          const sub_diff = new FolderDiffer({
            prev_folder: prev_file,
            folder: cur_file as AliyunDriveFolder,
            unique_key: this.unique_key,
            filter: this.filter,
            on_print: (node) => {
              this.emit(Events.Print, node);
            },
          });
          sub_diff.is_child = true;
          // sub_diff.parent_folders = this.parent_folders.concat(cur_file);
          // sub_diff.prev_parent_folders = this.prev_parent_folders.concat(prev_file);
          // log(prefix, "继续对比子文件2");
          await sub_diff.run(prefix);
          // log(
          //   prefix,
          //   "完成子文件",
          //   map[unique_key].file.name,
          //   cur_file.name,
          //   "对比",
          //   Object.keys(sub_diff.maybe_deleting).length,
          //   "个可能删除",
          //   Object.keys(sub_diff.maybe_adding).length,
          //   "个可能新增"
          // );
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
          // log("[DOMAIN](FolderDiffer)existing maybe adding, so delete it", this.maybe_adding[unique_key].name);
          // log(prefix, "文件之前判断可能是新增，现在确定不是，移除它", cur_file.name);
          delete this.maybe_adding[unique_key];
        }
        delete map[unique_key];
        continue;
      }
      // log("[DOMAIN](FolderDiffer)3.0 - no same id, maybe adding", cur_file.name);
      // log(
      //   prefix,
      //   "可能是新增的文件",
      //   cur_file.name,
      //   this.prev_folder.name
      // );
      // 这里会重复添加，但是用 v 做 key 所以实际上没有重复添加成功
      this.maybe_adding[unique_key] = {
        file: cur_file as AliyunDriveFolder,
        prev_folder: this.prev_folder,
      } as MaybeActionPayload[string];
    }
    // "[DOMAIN](FolderDiffer)4.0 - maybe adding",
    // const maybe_adding_files = Object.keys(this.maybe_adding).map((k) => {
    //   return this.maybe_adding[k].file.name;
    // });
    // if (maybe_adding_files.length !== 0) {
    //   log(prefix, "完成对比后，可能是新增的文件列表", maybe_adding_files);
    // }
    // Object.keys(this.map).map((id) => {
    //   log("[DOMAIN](FolderDiffer)4.0 - maybe deleting", this.map[id].name);
    // });
    this.maybe_deleting = {
      // @todo 这个到底要不要加？如果不加，子文件 diff 到的结果就丢了
      ...this.maybe_deleting,
      ...map,
    };
    // "[DOMAIN](FolderDiffer)4.0 - maybe deleting",
    // const maybe_deleting_files = Object.keys(this.maybe_deleting).map((k) => {
    //   return this.maybe_deleting[k].file.name;
    // });
    // log(prefix, "保存可能删除的文件", maybe_deleting_files);
    // if (maybe_deleting_files.length !== 0) {
    //   log(prefix, "完成对比后，可能是被删除的文件列表", maybe_deleting_files);
    // }
    // log(prefix, "获取更多子文件");
    await this.run(parent_prefix, true);
  }

  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    this.on(Events.Print, handler);
  }
}
