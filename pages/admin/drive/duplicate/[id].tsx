import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import { RequestedResource } from "@/types";
import { request } from "@/utils/request";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

async function fetch_duplicate_episode_of_drive(body: { id: string }) {
  const { id } = body;
  const r = await request.get<{
    user_name: string;
    has_history: {
      id: string;
      file_name: string;
      file_id: string;
      parent_paths: string;
    }[];
    duplicate: {
      id: string;
      file_name: string;
      file_id: string;
      parent_paths: string;
    }[];
  }>(`/api/drive/episodes/duplicate/${id}`);
  return r;
}
type DuplicateResultOfDrive = RequestedResource<
  typeof fetch_duplicate_episode_of_drive
>;
function delete_duplicate_episode(body: { file_id: string }) {
  const { file_id } = body;
  return request.get(`/api/drive/episodes/duplicate/delete/${file_id}`);
}

const DuplicateEpisodesInDrivePage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [result, set_result] = useState<DuplicateResultOfDrive>({
    user_name: "loading",
    has_history: [],
    duplicate: [],
  });

  const id = router.query.id as string;

  const refresh = useCallback(async (id: string) => {
    const r = await fetch_duplicate_episode_of_drive({ id });
    if (r.error) {
      toast({
        title: "ERROR",
        description: r.error.message,
      });
      return;
    }
    set_result(r.data);
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }
    refresh(id);
  }, [id]);

  const { user_name, has_history, duplicate } = result;

  return (
    <>
      <Head>
        <title>重复影片</title>
      </Head>
      <div className="mx-auto w-[960px] py-8">
        <div className="text-5xl">{user_name}</div>
        <div className="mt-8">
          <div className="text-2xl">有关联播放记录的影片</div>
          <div className="mt-4 space-y-4">
            {has_history.map((episode) => {
              const { id, file_name, file_id, parent_paths } = episode;
              return (
                <div key={id}>
                  <p>{file_id}</p>
                  <p>{file_name}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-12">
          <div className="text-2xl">未关联播放记录的影片</div>
          <div className="mt-4 space-y-6">
            {duplicate.map((episode) => {
              const { id, file_name, file_id, parent_paths } = episode;
              return (
                <div key={id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div>
                      <p>{file_id}</p>
                      <p className="mt-2 break-all whitespace-pre-wrap">
                        {parent_paths}/{file_name}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const r = await delete_duplicate_episode({ file_id });
                        if (r.error) {
                          toast({
                            title: "ERROR",
                            description: r.error.message,
                          });
                          return;
                        }
                        toast({
                          title: "Tip",
                          description: "删除成功",
                        });
                        refresh(id);
                      }}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default DuplicateEpisodesInDrivePage;
