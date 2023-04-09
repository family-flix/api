/**
 * @file 更新中的电视剧列表
 */
import Head from "next/head";

import ScrollView from "@/components/ScrollView";
import { FetchParams } from "@list-helper/core/typing";
import { request } from "@/utils/request";
import useHelper from "@/domains/list-helper-hook";
import { useEffect } from "react";
import { ListResponse, RequestedResource } from "@/types";
import { useRouter } from "next/router";
import { relative_time_from_now } from "@/utils";

async function fetch_shared_files_in_progress(body: FetchParams) {
  const r = await request.get<
    ListResponse<{
      id: string;
      url: string;
      name: string;
      complete: number;
      need_update: number;
      created: string;
    }>
  >("/api/admin/shared_files_in_progress/list", body);
  if (r.error) {
    return r;
  }
  return {
    ...r.data,
    list: r.data.list.map((f) => {
      const { created, ...rest } = f;
      return {
        ...rest,
        created: relative_time_from_now(created),
      };
    }),
  };
}
type SharedFileHistory = RequestedResource<
  typeof fetch_shared_files_in_progress
>["list"][0];

const SharedFilesHistoryPage = () => {
  const router = useRouter();
  const [response, helper] = useHelper<SharedFileHistory>(
    fetch_shared_files_in_progress
  );

  useEffect(() => {
    helper.init();
  }, []);

  const { dataSource } = response;

  return (
    <>
      <Head>
        <title>更新中的电视剧列表</title>
      </Head>
      <div className="mx-auto w-[960px] py-8">
        <ScrollView
          {...response}
          onLoadMore={() => {
            helper.loadMore();
          }}
        >
          <div className="space-y-4">
            {dataSource.map((shared_file) => {
              const { id, url, name, complete, need_update, created } =
                shared_file;
              return (
                <div
                  key={id}
                  className="p-4"
                  onClick={() => {
                    router.push(`/admin/shared_files?url=${url}`);
                  }}
                >
                  <div className="text-xl">{name}</div>
                  <div>{url}</div>
                  {complete ? <div>已完结</div> : null}
                  {need_update ? <div>需重新关联文件夹</div> : null}
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
