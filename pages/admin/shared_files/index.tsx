/**
 * @file 分享文件转存
 */
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import FolderCard from "@/components/FolderCard";
import FolderMenu from "@/components/FolderMenu";
import LazyImage from "@/components/LazyImage";
import ScrollView from "@/components/ScrollView";
import SingleModal from "@/components/SingleModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DriveFolders from "@/components/DriveFolders";
import { Tabs, TabsTrigger, TabsList, TabsContent } from "@/components/ui/tabs";
import { fetch_aliyun_drives, AliyunDriveItem } from "@/domains/drive/services";
import useHelper from "@/domains/list-helper-hook";
import { useToast } from "@/hooks/use-toast";
import {
  fetch_shared_files,
  save_shared_files,
  AliyunFolderItem,
  patch_added_files,
  build_link_between_shared_files_with_folder,
  check_has_same_name_tv,
  TVItem,
  find_folders_has_same_name,
  FolderItem,
} from "@/services";
import { Result } from "@/types";

class SharedResource {
  url: string;
  file_id: string = "";
  files: AliyunFolderItem[] = [];
  next_marker: string = "";
  loading = false;
  paths: {
    file_id: string;
    name: string;
  }[] = [];

  constructor(options: { url: string }) {
    const { url } = options;
    this.url = url;
  }
  async _fetch(file_id: string) {
    this.file_id = file_id;
    if (this.loading) {
      return Result.Err("is loading");
    }
    this.loading = true;
    const r = await fetch_shared_files({
      url: this.url,
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

const SharedFilesManagePage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [url, set_url] = useState<string>("");
  const cur_ref = useRef<SharedResource | null>(null);
  const cur_folder_ref = useRef<AliyunFolderItem | null>(null);
  const [files, set_files] = useState<AliyunFolderItem[]>([]);
  const [paths, set_paths] = useState<{ file_id: string; name: string }[]>([]);
  const [drives_response, drive_helper] =
    useHelper<AliyunDriveItem>(fetch_aliyun_drives);
  const same_name_tv_ref = useRef<TVItem | null>(null);
  const [visible, set_visible] = useState(false);
  const [drive_folder_visible, set_drive_folder_visible] = useState(false);

  useEffect(() => {
    drive_helper.init();
  }, []);
  useEffect(() => {
    if (!router.query.url) {
      return;
    }
    const url = router.query.url as string;
    set_url(url);
    (async () => {
      cur_ref.current = new SharedResource({ url });
      cur_ref.current.reset();
      const r = await cur_ref.current.fetch("root", "root");
      if (r.error) {
        toast({
          title: "Error",
          description: r.error.message,
        });
        return;
      }
      set_files(cur_ref.current.files);
      set_paths(cur_ref.current.paths);
    })();
  }, [router.query.url]);

  return (
    <>
      <Head>
        <title>转存文件</title>
      </Head>
      <div className="min-h-screen pt-8">
        <div className="m-auto w-[960px] space-y-4">
          <h2 className="h2 mt-4">转存文件</h2>
          <div>
            <Textarea
              placeholder="请输入分享链接"
              value={url}
              onChange={(event) => {
                set_url(event.target.value);
              }}
            />
            <div className="grid grid-cols-1 mt-2">
              <Button
                onClick={async () => {
                  cur_ref.current = new SharedResource({ url });
                  cur_ref.current.reset();
                  const r = await cur_ref.current.fetch("root", "root");
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
                获取
              </Button>
            </div>
          </div>
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
                const { file_id, name, type } = file;
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
                          label: "显示同名文件夹",
                          async on_click() {
                            if (cur_folder_ref.current === null) {
                              return;
                            }
                            set_drive_folder_visible(true);
                          },
                        },
                        {
                          label: "查找同名文件夹并建立关联",
                          async on_click() {
                            if (cur_folder_ref.current === null) {
                              return;
                            }
                            const r =
                              await build_link_between_shared_files_with_folder(
                                {
                                  url,
                                  file_id: cur_folder_ref.current.file_id,
                                  file_name: cur_folder_ref.current.name,
                                }
                              );
                            if (r.error) {
                              toast({
                                title: "ERROR",
                                description: r.error.message,
                              });
                              return;
                            }
                            toast({
                              title: "Success",
                              description: "操作成功",
                            });
                          },
                        },
                        {
                          label: "同名影视剧检查",
                          async on_click() {
                            if (cur_folder_ref.current === null) {
                              return;
                            }
                            if (!url) {
                              return;
                            }
                            const r = await check_has_same_name_tv({
                              file_name: name,
                            });
                            if (r.error) {
                              toast({
                                title: "ERROR",
                                description: r.error.message,
                              });
                              return;
                            }
                            const d = r.data;
                            if (d === null) {
                              toast({
                                title: "Tip",
                                description: "没有同名影视剧",
                              });
                              return;
                            }
                            same_name_tv_ref.current = d;
                            set_visible(true);
                            toast({
                              title: "Tip",
                              description: "存在同名影视剧",
                            });
                          },
                        },
                        {
                          label: "转存新增影片",
                          async on_click() {
                            if (cur_folder_ref.current === null) {
                              return;
                            }
                            if (!url) {
                              return;
                            }
                            const r = await patch_added_files({
                              url,
                              file_id: cur_folder_ref.current.file_id,
                              file_name: name,
                            });
                            if (r.error) {
                              toast({
                                title: "ERROR",
                                description: r.error.message,
                              });
                              return;
                            }
                            toast({
                              title: "Success",
                              description: "操作成功",
                            });
                          },
                        },
                        {
                          label: "转存到",
                          children: drives_response.dataSource.map((drive) => {
                            const { name } = drive;
                            return {
                              label: name,
                              async on_click() {
                                if (cur_folder_ref.current === null) {
                                  return;
                                }
                                if (!url) {
                                  return;
                                }
                                const r = await save_shared_files({
                                  url,
                                  file_id: cur_folder_ref.current.file_id,
                                  file_name: cur_folder_ref.current.name,
                                  drive_id: drive.id,
                                });
                                if (r.error) {
                                  toast({
                                    title: "ERROR",
                                    description: r.error.message,
                                  });
                                  return;
                                }
                                toast({
                                  title: "Success",
                                  description: "操作成功",
                                });
                              },
                            };
                          }),
                        },
                      ]}
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
        <SingleModal
          title="同名影视剧"
          visible={visible}
          footer={null}
          on_cancel={async () => {
            set_visible(false);
            return Result.Ok(null);
          }}
        >
          {(() => {
            if (same_name_tv_ref.current === null) {
              return null;
            }
            const {
              id,
              name,
              original_name,
              overview,
              poster_path,
              first_air_date,
            } = same_name_tv_ref.current;
            return (
              <div
                className="flex"
                onClick={() => {
                  router.push(`/play/${id}`);
                }}
              >
                <LazyImage
                  className="w-[180px] mr-4 object-fit"
                  src={poster_path}
                  alt={name || original_name}
                />
                <div className="flex-1">
                  <div className="text-2xl">{name || original_name}</div>
                  <div className="mt-4">{overview}</div>
                  <div className="mt-4">{first_air_date}</div>
                </div>
              </div>
            );
          })()}
        </SingleModal>
        <SingleModal
          title="文件夹"
          visible={drive_folder_visible}
          footer={null}
          on_cancel={async () => {
            console.log("1 set_drive_folder_visible false");
            set_drive_folder_visible(false);
            return Result.Ok(null);
          }}
        >
          <Tabs
            defaultValue={
              drives_response.dataSource.length
                ? drives_response.dataSource[0]?.user_name
                : undefined
            }
          >
            <TabsList>
              {drives_response.dataSource.map((drive) => {
                const { id, user_name } = drive;
                return (
                  <TabsTrigger key={id} value={user_name}>
                    {user_name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {drives_response.dataSource.map((drive) => {
              const { id, user_name } = drive;
              return (
                <TabsContent
                  className="p-4 min-h-[536px]"
                  key={id}
                  value={user_name}
                >
                  <DriveFolders
                    key={id}
                    className="grid-cols-3"
                    options={[
                      {
                        label: "选择",
                        async on_click(value) {
                          if (!value) {
                            return;
                          }
                          if (cur_folder_ref.current === null) {
                            return;
                          }
                          const shared_folder = cur_folder_ref.current;
                          const folder = value as FolderItem;
                          const r =
                            await build_link_between_shared_files_with_folder({
                              url,
                              file_id: shared_folder.file_id,
                              file_name: shared_folder.name,
                              target_file_id: folder.file_id,
                            });
                          if (r.error) {
                            toast({
                              title: "ERROR",
                              description: r.error.message,
                            });
                            return;
                          }
                          toast({
                            title: "成功",
                            description: "建立关联成功",
                          });
                        },
                      },
                    ]}
                    id={id}
                    size={6}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        </SingleModal>
      </div>
    </>
  );
};

export default SharedFilesManagePage;
