import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import ScrollView from "@/components/ScrollView";
import LazyImage from "@/components/LazyImage";
import FolderMenu from "@/components/FolderMenu";
import { TMDBSearcherDialog } from "@/components/TMDBSearcher/dialog";
import useHelper from "@/domains/list-helper-hook";
import {
  bind_searched_tv_for_tv,
  fetch_unknown_tv_list,
  UnknownTVItem,
} from "@/services";
import FolderCard from "@/components/FolderCard";
import { scrape_tv } from "@/domains/tv/services";
import { useToast } from "@/hooks/use-toast";
import { Result } from "@/types";

const UnknownTVManagePage = () => {
  const [response, helper] = useHelper<UnknownTVItem>(fetch_unknown_tv_list, {
    pageSize: 24,
  });
  const cur_ref = useRef<UnknownTVItem | null>(null);
  const [visible, set_visible] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    helper.init();
  }, []);

  const { dataSource, loading, noMore, error } = response;

  return (
    <>
      <Head>
        <title>未识别的影视剧</title>
      </Head>
      <div className="min-h-screen pt-8">
        <div className="m-auto w-[960px] space-y-4">
          <h2 className="h2 mt-4">未识别的影视剧</h2>
          <ScrollView
            {...response}
            onLoadMore={() => {
              helper.loadMore();
            }}
          >
            <div className="grid grid-cols-6 gap-2">
              {dataSource.map((file) => {
                const { id, name } = file;
                return (
                  <div
                    key={id}
                    className="w-[152px] p-4 rounded cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={async () => {}}
                  >
                    <FolderMenu
                      options={[
                        {
                          label: "重新索引",
                          async on_click() {
                            if (cur_ref.current === null) {
                              return;
                            }
                            const r = await scrape_tv({ id });
                            if (r.error) {
                              toast({
                                title: "ERROR",
                                description: r.error.message,
                              });
                              return;
                            }
                            helper.refresh();
                            toast({
                              title: "Success",
                              description: "索引成功",
                            });
                          },
                        },
                        {
                          label: "手动索引",
                          async on_click() {
                            cur_ref.current = file;
                            set_visible(true);
                          },
                        },
                        {
                          label: "修改名称",
                          async on_click() {
                            // cur_ref.current = file;
                            // set_visible(true);
                          },
                        },
                      ]}
                    >
                      <FolderCard
                        type="folder"
                        name={name}
                        onContextMenu={() => {
                          cur_ref.current = file;
                        }}
                        onClick={() => {
                          router.push(`/admin/unknown_tv/${id}`);
                        }}
                      />
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
            helper.refresh();
            set_visible(false);
            return Result.Ok(null);
          }}
        />
      </div>
    </>
  );
};

export default UnknownTVManagePage;
