import { useEffect } from "react";
import Head from "next/head";

import ScrollView from "@/components/ScrollView";
import useHelper from "@/domains/list-helper-hook";
import { ListResponse, RequestedResource } from "@/types";
import { request } from "@/utils/request";
import { FetchParams } from "@list-helper/core/typing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { goto } from "@/utils/front_end";

function fetch_serialized_shared_file(body: FetchParams) {
  return request.get<
    ListResponse<{
      id: string;
      url: string;
      file_id: string;
      name: string;
      complete: number;
    }>
  >("/api/shared_files/serialized/list", body);
}
type SerializedSharedFile = RequestedResource<
  typeof fetch_serialized_shared_file
>["list"][0];

function update_serialized_shared_file(body: { id: string }) {
  const { id } = body;
  return request.get<string[]>(`/api/shared_files/serialized/patch/${id}`);
}

const SerializedSharedFileManagePage = () => {
  const [response, helper] = useHelper<SerializedSharedFile>(
    fetch_serialized_shared_file
  );
  const { toast } = useToast();

  useEffect(() => {
    helper.init();
  }, []);

  const { dataSource } = response;

  return (
    <>
      <Head>
        <title>定时更新任务</title>
      </Head>
      <div className="mx-auto py-8 w-[960px]">
        <ScrollView
          {...response}
          onLoadMore={() => {
            helper.loadMore();
          }}
        >
          <div className="space-y-4">
            {dataSource.map((folder) => {
              const { id, name, url } = folder;
              return (
                <div key={id} className="p-4">
                  <div className="text-xl">{name}</div>
                  <div className="flex space-x-4 mt-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        const r = await update_serialized_shared_file({ id });
                        if (r.error) {
                          toast({
                            title: "ERROR",
                            description: r.error.message,
                          });
                          return;
                        }
                        if (r.data.length === 0) {
                          toast({
                            title: "Tip",
                            description: "没有更新内容",
                          });
                          return;
                        }
                        toast({
                          title: "Tip",
                          description: (
                            <div>
                              <div>更新成功，新增影片</div>
                              <div className="mt-4 space-y-2">
                                {r.data.map((name, i) => {
                                  return <div key={i}>{name}</div>;
                                })}
                              </div>
                            </div>
                          ),
                        });
                      }}
                    >
                      更新
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        goto(url);
                      }}
                    >
                      前往原始分享链接
                    </Button>
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

export default SerializedSharedFileManagePage;
