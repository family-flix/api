/**
 * @file 网盘详情页面，包括该网盘内的所有文件夹
 */
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import FolderCard from "@/components/FolderCard";
import FolderMenu from "@/components/FolderMenu";
import ScrollView from "@/components/ScrollView";
import { useToast } from "@/hooks/use-toast";
import {
  AliyunFolderItem,
  delete_file_in_drive,
  fetch_aliyun_drive_files,
  walk_aliyun_folder,
} from "@/services";
import { Result } from "@/types";
import {
  AliyunDriveProfile,
  analysis_aliyun_drive,
  fetch_aliyun_drive_profile,
} from "@/domains/drive/services";

class AliyunDriveFolder {
  /**
   * 网盘 id
   */
  id: string;
  file_id: string = "";
  files: AliyunFolderItem[] = [];
  next_marker: string = "";
  loading = false;
  paths: {
    file_id: string;
    name: string;
  }[] = [];

  constructor(options: { id: string }) {
    const { id } = options;
    this.id = id;
  }
  async _fetch(file_id: string) {
    this.file_id = file_id;
    if (this.loading) {
      return Result.Err("is loading");
    }
    this.loading = true;
    const r = await fetch_aliyun_drive_files({
      drive_id: this.id,
      file_id,
      next_marker: this.next_marker,
    });
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
  async load_more() {
    const r = await this._fetch(this.file_id);
    if (r.error) {
      return r;
    }
    this.files = this.files.concat(r.data.items);
    this.next_marker = r.data.next_marker;
    return Result.Ok(null);
  }
}

const DriveProfilePage = () => {
  const router = useRouter();
  const cur_ref = useRef<AliyunDriveFolder | null>(null);
  const cur_folder_ref = useRef<AliyunFolderItem | null>(null);
  const [files, set_files] = useState<AliyunFolderItem[]>([]);
  const [paths, set_paths] = useState<{ file_id: string; name: string }[]>([]);
  const { toast } = useToast();
  const [profile, set_profile] = useState<AliyunDriveProfile | null>(null);

  useEffect(() => {
    if (!router.query.id) {
      return;
    }
    (async () => {
      // console.log(router.query.id);
      const id = router.query.id as string;
      fetch_aliyun_drive_profile({ id }).then((r) => {
        if (r.error) {
          return;
        }
        set_profile(r.data);
      });
      cur_ref.current = new AliyunDriveFolder({
        id,
      });
      await cur_ref.current.fetch();
      set_files(cur_ref.current.files);
      set_paths(cur_ref.current.paths);
    })();
  }, [router.query]);

  return (
    <>
      <Head>
        <title>转存文件</title>
        <meta name="referrer" content="no-referrer" />
      </Head>
      <div className="min-h-screen pt-8">
        <div className="m-auto w-[960px] space-y-4">
          <h2 className="h2 mt-4">网盘详情</h2>
          <div className="flex items-cen">
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
          <div>
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
          </div>
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
            <div className="grid grid-cols-6 gap-2">
              {files.map((file) => {
                const { file_id, name, type, thumbnail } = file;
                return (
                  <div
                    key={file_id}
                    className="w-[152px] p-4 rounded cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700"
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
                      options={[
                        {
                          label: "查看详情",
                        },
                        {
                          label: "删除",
                          async on_click() {
                            if (cur_ref.current === null) {
                              return;
                            }
                            const r = await delete_file_in_drive({
                              file_id: cur_ref.current.file_id,
                            });
                            if (r.error) {
                              toast({
                                title: "ERROR",
                                description: r.error.message,
                              });
                              return;
                            }
                            toast({
                              title: "Tip",
                              description: "删除文件成功",
                            });
                          },
                        },
                        {
                          label: "重新索引",
                          async on_click() {
                            if (cur_ref.current === null) {
                              return;
                            }
                            if (profile === null) {
                              return;
                            }
                            console.log(file, paths);
                            const root_folder_index = paths.findIndex(
                              (p) => p.file_id === profile.root_folder_id
                            );
                            if (root_folder_index === -1) {
                              return;
                            }
                            const prefix = paths.slice(root_folder_index);
                            console.log(prefix);
                            const target_folder = prefix
                              .map((p) => p.name)
                              .concat(name)
                              .join("/");
                            const r = await analysis_aliyun_drive({
                              aliyun_drive_id: cur_ref.current.id,
                              target_folder,
                            });
                            if (r.error) {
                              return r;
                            }
                          },
                        },
                      ]}
                    >
                      <FolderCard
                        type={type}
                        name={name}
                        thumbnail={thumbnail}
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
      </div>
    </>
  );
};

export default DriveProfilePage;
