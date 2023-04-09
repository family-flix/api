/**
 * @file 网盘文件夹列表
 */
import { useEffect, useRef, useState } from "react";

import FolderCard from "@/components/FolderCard";
import FolderMenu, { MenuOpt } from "@/components/FolderMenu";
import ScrollView from "@/components/ScrollView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AliyunFolderItem, fetch_aliyun_drive_files } from "@/services";
import { Result } from "@/types";
import {
  AliyunDriveProfile,
  fetch_aliyun_drive_profile,
} from "@/domains/drive/services";
import { cn } from "@/lib/utils";

class AliyunDriveFolder {
  /**
   * 网盘 id
   */
  id: string;
  file_id: string = "";
  size: number;
  files: AliyunFolderItem[] = [];
  next_marker: string = "";
  loading = false;
  keyword: string = "";
  paths: {
    file_id: string;
    name: string;
  }[] = [];

  constructor(options: { id: string; size: number }) {
    const { id, size } = options;
    this.id = id;
    this.size = size;
  }
  async _fetch(file_id: string) {
    this.file_id = file_id;
    if (this.loading) {
      return Result.Err("is loading");
    }
    this.loading = true;
    const body = (() => {
      if (this.keyword) {
        return {
          name: this.keyword,
          drive_id: this.id,
          page_size: this.size,
          next_marker: this.next_marker,
        };
      }
      return {
        drive_id: this.id,
        file_id,
        page_size: this.size,
        next_marker: this.next_marker,
      };
    })();
    // @ts-ignore
    const r = await fetch_aliyun_drive_files(body);
    this.loading = false;
    if (r.error) {
      return r;
    }
    return r;
  }
  reset() {
    this.paths = [];
    this.files = [];
  }
  async fetch(file_id = "root", name = "root") {
    this.next_marker = "";
    const existing_index = this.paths.findIndex((p) => p.file_id === file_id);
    if (existing_index !== -1 && existing_index === this.paths.length - 1) {
      return Result.Err("已经在当前目录了");
    }
    const r = await this._fetch(file_id);
    if (r.error) {
      return r;
    }
    (() => {
      if (this.paths.length === 0) {
        this.paths = [{ file_id, name }];
        return;
      }
      if (existing_index !== -1) {
        this.paths = this.paths.slice(0, existing_index + 1);
        return;
      }
      this.paths = this.paths.concat([{ file_id, name }]);
    })();
    this.files = [...r.data.items];
    this.next_marker = r.data.next_marker;
    return Result.Ok(null);
  }
  async search(keyword: string) {
    this.keyword = keyword;
    const r = await this._fetch(this.file_id);
    this.keyword = "";
    if (r.error) {
      return r;
    }
    this.files = this.files = r.data.items;
    this.paths = [];
    this.next_marker = r.data.next_marker;
    return Result.Ok(null);
  }
  async load_more() {
    const r = await this._fetch(this.file_id);
    if (r.error) {
      return r;
    }
    this.files = this.files.concat(r.data.items);
    this.next_marker = r.data.next_marker;
    return Result.Ok(null);
  }
  async re_walk() {
    // const { paths, id } = this;
    // const root_folder_index = paths.findIndex(
    //   (p) => p.file_id === profile.root_folder_id
    // );
    // if (root_folder_index === -1) {
    //   return;
    // }
    // const prefix = paths.slice(root_folder_index);
    // const target_folder = prefix
    //   .map((p) => p.name)
    //   .concat(name)
    //   .join("/");
    // const r = await analysis_aliyun_drive({
    //   aliyun_drive_id: id,
    //   target_folder,
    // });
    // if (r.error) {
    //   return r;
    // }
  }
}

const DriveFolders = (props: {
  className: string;
  id: string;
  size?: number;
  options?: MenuOpt[];
}) => {
  const { className, options = [], id, size = 20 } = props;
  const cur_ref = useRef<AliyunDriveFolder | null>(null);
  const cur_folder_ref = useRef<AliyunFolderItem | null>(null);
  const [files, set_files] = useState<AliyunFolderItem[]>([]);
  const [paths, set_paths] = useState<{ file_id: string; name: string }[]>([]);
  const [profile, set_profile] = useState<AliyunDriveProfile | null>(null);
  const [keyword, set_keyword] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!id) {
      return;
    }
    (async () => {
      fetch_aliyun_drive_profile({ id }).then((r) => {
        if (r.error) {
          return;
        }
        set_profile(r.data);
      });
      cur_ref.current = new AliyunDriveFolder({
        id,
        size,
      });
      await cur_ref.current.fetch();
      set_files(cur_ref.current.files);
      set_paths(cur_ref.current.paths);
    })();
  }, [id, size]);

  return (
    <div className="">
      <div className="grid grid-cols-12 gap-4">
        <Input
          className="col-span-9"
          placeholder="请输入文件夹名称搜索"
          value={keyword}
          onChange={(event) => {
            set_keyword(event.target.value);
          }}
        />
        <Button
          className="col-span-3"
          onClick={async () => {
            if (cur_ref.current === null) {
              return;
            }
            await cur_ref.current.search(keyword);
            set_files(cur_ref.current.files);
            set_paths(cur_ref.current.paths);
          }}
        >
          搜索
        </Button>
      </div>
      <div className="flex mt-4">
        {paths.map((p, index) => {
          const { file_id, name } = p;
          return (
            <div key={file_id} className="flex items-center">
              <div
                className="text-blue-400 cursor-pointer hover:text-blue-500"
                onClick={async () => {
                  if (cur_ref.current === null) {
                    return;
                  }
                  const r = await cur_ref.current.fetch(file_id, name);
                  if (r.error) {
                    toast({
                      title: "Error",
                      description: r.error.message,
                    });
                    return;
                  }
                  set_files(cur_ref.current.files);
                  set_paths(cur_ref.current.paths);
                }}
              >
                {name}
              </div>
              {index === paths.length - 1 ? null : (
                <div className="mx-2 text-gray-300">/</div>
              )}
            </div>
          );
        })}
      </div>
      {/* <div>
        {(() => {
          if (paths.length === 0) {
            return null;
          }
          const last = paths[paths.length - 1];
          return (
            <div
              onClick={async () => {
                if (cur_ref.current === null) {
                  return;
                }
                await walk_aliyun_folder({
                  drive_id: cur_ref.current.id,
                  file_id: last.file_id,
                  name: last.name,
                });
                toast({
                  title: "Success",
                  description: "mock 数据生成成功",
                });
              }}
            >
              {last.file_id}
            </div>
          );
        })()}
      </div> */}
      <ScrollView
        dataSource={cur_ref.current?.files || []}
        loading={false}
        initial={false}
        error={undefined}
        noMore={!cur_ref.current?.next_marker}
        onLoadMore={async () => {
          if (cur_ref.current === null) {
            return;
          }
          if (!cur_ref.current.next_marker) {
            return;
          }
          const r = await cur_ref.current.load_more();
          if (r.error) {
            toast({
              title: "Error",
              description: r.error.message,
            });
            return;
          }
          set_files(cur_ref.current.files);
        }}
      >
        <div className={cn("grid grid-cols-6 gap-2", className)}>
          {files.map((file) => {
            const { file_id, name, type } = file;
            return (
              <div
                key={file_id}
                className="w-[152px] p-4 rounded cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-800"
                onClick={async () => {
                  if (cur_ref.current === null) {
                    return;
                  }
                  if (type !== "folder") {
                    return;
                  }
                  await cur_ref.current.fetch(file_id, name);
                  set_files(cur_ref.current.files);
                  set_paths(cur_ref.current.paths);
                }}
              >
                <FolderMenu
                  options={options.map((opt) => {
                    const { label, on_click } = opt;
                    return {
                      label,
                      on_click() {
                        if (cur_folder_ref.current) {
                          if (on_click) {
                            on_click(cur_folder_ref.current);
                          }
                          return;
                        }
                        if (on_click) {
                          on_click();
                        }
                      },
                    };
                  })}
                >
                  <FolderCard
                    type={type}
                    name={name}
                    onContextMenu={() => {
                      cur_folder_ref.current = file;
                    }}
                  />
                </FolderMenu>
              </div>
            );
          })}
        </div>
      </ScrollView>
    </div>
  );
};

export default DriveFolders;
