/**
 * @file 查询过的分享文件列表
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

async function fetch_shared_files_histories(body: FetchParams) {
  const r = await request.get<
    ListResponse<{
      id: string;
      url: string;
      title: string;
      created: string;
    }>
  >("/api/shared_files/list", body);
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
  typeof fetch_shared_files_histories
>["list"][0];

const SharedFilesHistoryPage = () => {
  const router = useRouter();
  const [response, helper] = useHelper<SharedFileHistory>(
    fetch_shared_files_histories
  );

  useEffect(() => {
    helper.init();
  }, []);

  const { dataSource } = response;

  return (
    <>
      <Head>
        <title>转存查看记录</title>
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
              const { id, url, title, created } = shared_file;
              return (
                <div
                  key={id}
                  className="p-4"
                  onClick={() => {
                    router.push(`/admin/shared_files?url=${url}`);
                  }}
                >
                  <p>{title}</p>
                  <div>{url}</div>
                  <div>{created}</div>
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
