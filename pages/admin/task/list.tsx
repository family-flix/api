import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

import useHelper from "@/domains/list-helper-hook";
import {
  AsyncTask,
  fetch_async_tasks,
  stop_async_task,
} from "@/domains/shared_files/services";
import ScrollView from "@/components/ScrollView";
import { Button } from "@/components/ui/button";

const TasksPage = () => {
  const router = useRouter();
  const [response, helper] = useHelper<AsyncTask>(fetch_async_tasks);
  useEffect(() => {
    helper.init();
  }, []);

  const { dataSource, loading, error, noMore } = response;
  return (
    <>
      <Head>
        <title>任务列表</title>
      </Head>
      <div className="min-h-screen pt-8">
        <div className="m-auto w-[960px] space-y-4">
          <h2 className="h2 mt-4">所有任务</h2>
          <ScrollView
            {...response}
            onLoadMore={() => {
              helper.loadMore();
            }}
          >
            <div className="space-y-4">
              {dataSource.map((t) => {
                const { id, status, unique_id, desc, created } = t;
                return (
                  <div
                    key={id}
                    className="card cursor-pointer"
                    onClick={() => {
                      router.push(`/task/${id}`);
                    }}
                  >
                    <h2 className="text-xl">{desc}</h2>
                    <div>{unique_id}</div>
                    <div className="flex items-center justify-between">
                      <div>{status}</div>
                      <div>{created}</div>
                    </div>
                    {status === "Running" ? (
                      <Button
                        onClick={async (event) => {
                          event.stopPropagation();
                          const r = await stop_async_task(id);
                          if (r.error) {
                            alert(r.error.message);
                            return;
                          }
                          helper.refresh();
                        }}
                      >
                        停止任务
                      </Button>
                    ) : null}
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

export default TasksPage;
