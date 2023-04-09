/**
 * @file 查询过的分享文件列表
 */
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import ScrollView from "@/components/ScrollView";
import LazyImage from "@/components/LazyImage";
import { Button } from "@/components/ui/button";
import useHelper from "@/domains/list-helper-hook";
import { FetchParams } from "@list-helper/core/typing";
import { request } from "@/utils/request";
import { ListResponse, RequestedResource, Result } from "@/types";
import { goto } from "@/utils/front_end";
import { useToast } from "@/hooks/use-toast";
import Modal from "@/components/Modal";
import { Input } from "@/components/ui/input";

async function fetch_tv_need_complete(body: FetchParams) {
  const r = await request.get<
    ListResponse<{
      id: string;
      name: string;
      original_name: string;
      poster_path: string;
      season_number: string;
      season_name: string;
      episode_count: string;
      cur_episode_count: string;
      tv_id: string;
      tmdb_id: string;
    }>
  >("/api/admin/tv_need_complete/list", body);
  if (r.error) {
    return r;
  }
  return r.data;
}
type TVNeedCompleteItem = RequestedResource<
  typeof fetch_tv_need_complete
>["list"][0];
export function fetch_link_shared_folder(body: { name: string }) {
  const { name, ...rest } = body;
  return request.get<
    ListResponse<{
      id: string;
      url: string;
    }>
  >(`/api/shared_files/list`, { ...rest, name });
}
type SharedFolderItem = RequestedResource<
  typeof fetch_link_shared_folder
>["list"][0];

/**
 * 更新
 * @param id
 * @param body
 * @returns
 */
export function update_tv_need_complete(
  id: string,
  body: {
    episode_count: string;
  }
) {
  return request.post(`/api/admin/tv_need_complete/update/${id}`, body);
}

const SharedFilesHistoryPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [, folder_helper] = useHelper<SharedFolderItem>(
    fetch_link_shared_folder
  );
  const [response, helper] = useHelper<TVNeedCompleteItem>(
    fetch_tv_need_complete
  );
  const cur_ref = useRef<TVNeedCompleteItem | null>(null);
  const [values, set_values] = useState<Partial<{ episode_count: string }>>({});

  useEffect(() => {
    helper.init();
  }, []);

  const { dataSource } = response;

  return (
    <>
      <Head>
        <title>需处理的电视剧列表</title>
      </Head>
      <div className="mx-auto w-[960px] py-8">
        <ScrollView
          {...response}
          onLoadMore={() => {
            helper.loadMore();
          }}
        >
          <div className="space-y-4">
            {dataSource.map((tv) => {
              const {
                id,
                name,
                original_name,
                season_name,
                poster_path,
                tv_id,
                tmdb_id,
                season_number,
                episode_count,
                cur_episode_count,
              } = tv;
              return (
                <div key={id} className="flex p-4" onClick={() => {}}>
                  <div className="rounded-sm mr-4 w-[120px]">
                    <LazyImage className="w-full h-full" src={poster_path} />
                  </div>
                  <div>
                    <p className="text-xl">{name || original_name}</p>
                    <p>{season_name}</p>
                    <p>应该有 {episode_count}</p>
                    <p>现在有 {cur_episode_count}</p>
                    <div className="mt-4 flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          goto(
                            `https://www.themoviedb.org/tv/${tmdb_id}/season/${season_number}`
                          );
                        }}
                      >
                        前往 TMDB
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          const { dataSource } = await folder_helper.search({
                            name: name || original_name,
                          });
                          if (dataSource.length === 0) {
                            toast({
                              title: "Tip",
                              description: "没有",
                            });
                            return;
                          }
                          goto(dataSource[0]?.url);
                        }}
                      >
                        是否有关联分享文件夹
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          goto(`/admin/tv/${tv_id}`);
                        }}
                      >
                        查看详情
                      </Button>
                      <Modal
                        title="修改信息"
                        trigger={
                          <Button
                            onClick={() => {
                              cur_ref.current = tv;
                            }}
                          >
                            编辑
                          </Button>
                        }
                        on_ok={async () => {
                          if (cur_ref.current === null) {
                            return Result.Err("请先选择要编辑的电视剧");
                          }
                          if (!values.episode_count) {
                            return Result.Err("请填写正确集数");
                          }
                          const r = await update_tv_need_complete(
                            cur_ref.current.id,
                            {
                              episode_count: values.episode_count,
                            }
                          );
                          if (r.error) {
                            return Result.Err(r.error.message);
                          }
                          return Result.Ok(null);
                        }}
                      >
                        <Input
                          value={values.episode_count}
                          onChange={(event) => {
                            set_values((prev_values) => {
                              return {
                                ...prev_values,
                                episode_count: event.target.value,
                              };
                            });
                          }}
                        />
                      </Modal>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollView>
      </div>
    </>
  );
};

export default SharedFilesHistoryPage;
