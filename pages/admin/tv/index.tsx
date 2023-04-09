/**
 * @file 管理员/tv 管理页面
 */
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import useHelper from "@/domains/list-helper-hook";
import LazyImage from "@/components/LazyImage";
import ScrollView from "@/components/ScrollView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FolderMenu from "@/components/FolderMenu";
import { TMDBSearcherDialog } from "@/components/TMDBSearcher/dialog";
import { bind_searched_tv_for_tv, fetch_tv_list, TVItem } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { Result } from "@/types";
import { hidden_tv } from "@/domains/tv/services";

const TVManagePage = () => {
  const router = useRouter();
  const [response, helper] = useHelper<TVItem>(fetch_tv_list);
  const [name, set_name] = useState("");
  const cur_ref = useRef<TVItem | null>(null);
  const [visible, set_visible] = useState(false);
  const { toast } = useToast();

  const { dataSource } = response;

  return (
    <>
      <Head>
        <title>影视剧管理</title>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta name="description" content="影视剧列表" />
        <meta name="referrer" content="no-referrer" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen p-4 pt-8">
        <div className="m-auto space-y-2">
          <div className="">
            <h2 className="h2">搜索结果</h2>
            <div className="flex mt-4 space-x-2">
              <Input
                className=""
                placeholder="请输入名称搜索"
                value={name}
                onChange={(event) => {
                  set_name(event.target.value);
                }}
              />
              <Button
                className="w-[80px]"
                onClick={() => {
                  if (!name) {
                    return;
                  }
                  helper.search({ name });
                }}
              >
                搜索
              </Button>
              <Button
                className="w-[80px]"
                onClick={() => {
                  helper.reset();
                }}
              >
                重置
              </Button>
            </div>
          </div>
          <ScrollView {...response} onLoadMore={helper.loadMore}>
            <div className="space-y-4">
              {dataSource.map((t) => {
                const {
                  id,
                  name,
                  original_name,
                  overview,
                  poster_path,
                  first_air_date,
                } = t;
                return (
                  <div
                    key={id}
                    className="card cursor-pointer"
                    onClick={() => {
                      router.push(`/admin/tv/${id}`);
                    }}
                  >
                    <FolderMenu
                      options={[
                        {
                          label: "修改",
                          on_click() {
                            cur_ref.current = t;
                            set_visible(true);
                          },
                        },
                        {
                          label: "隐藏",
                          async on_click() {
                            const r = await hidden_tv({ id });
                            if (r.error) {
                              toast({
                                title: "ERROR",
                                description: r.error.message,
                              });
                            }
                            helper.refresh();
                          },
                        },
                      ]}
                    >
                      <div className="flex">
                        <LazyImage
                          className="mr-4 w-[180px] object-fit"
                          src={poster_path}
                          alt={name || original_name}
                        />
                        <div className="flex-1">
                          <h2 className="text-2xl">{name}</h2>
                          <div className="mt-4">
                            <p className="">{overview}</p>
                            <p className="">{first_air_date}</p>
                          </div>
                        </div>
                      </div>
                    </FolderMenu>
                  </div>
                );
              })}
            </div>
          </ScrollView>
        </div>
        <TMDBSearcherDialog
          visible={visible}
          on_visible_change={set_visible}
          on_submit={async (searched_tv) => {
            if (cur_ref.current === null) {
              return Result.Err("请先选择文件夹");
            }
            const { id } = cur_ref.current;
            const r = await bind_searched_tv_for_tv(id, searched_tv);
            if (r.error) {
              toast({
                title: "ERROR",
                description: r.error.message,
              });
              return r;
            }
            toast({
              title: "Success",
              description: "修改成功",
            });
            set_visible(false);
            helper.refresh();
            return Result.Ok(null);
          }}
        />
      </div>
    </>
  );
};

export default TVManagePage;
