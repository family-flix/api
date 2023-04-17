/**
 * @file 解析出认为是电视剧，但无法根据解析出的名字在 TMDB 找到结果的电视剧
 */
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

import { RequestedResource, Result } from "@/types";
import { request } from "@/utils/request";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { TVFormDialog } from "@/components/TVForm/dialog";
import LazyImage from "@/components/LazyImage";
import FolderMenu from "@/components/FolderMenu";
import { TMDBSearcherDialog } from "@/components/TMDBSearcher/dialog";
import { bind_searched_tv_for_tv, delete_file_in_drive } from "@/services";

async function fetch_tv_profile(body: { tv_id: string }) {
  const { tv_id } = body;
  const r = await request.get<{
    id: string;
    name: string;
    original_name: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    episodes: {
      id: string;
      episode: string;
      season: string;
      parent_paths: string;
      file_name: string;
    }[];
  }>(`/api/admin/tv/${tv_id}`);
  return r;
}
type TVProfile = RequestedResource<typeof fetch_tv_profile>;
async function delete_episode_in_tv(body: { id: string; tv_id: string }) {
  const { id, tv_id } = body;
  const r = await request.get(`/admin/tv/episode/${id}`, { tv_id });
  return r;
}

const TVProfileInAdminPage = () => {
  const [profile, set_profile] = useState<TVProfile | null>(null);
  const [visible, set_visible] = useState(false);
  const cur_episode_ref = useRef<TVProfile["episodes"][0] | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const refresh = useCallback(async (id: string) => {
    const r = await fetch_tv_profile({ tv_id: id });
    if (r.error) {
      toast({
        title: "ERROR",
        description: r.error.message,
      });
      return;
    }
    set_profile(r.data);
    console.log(r.data);
  }, []);

  useEffect(() => {
    const { id } = router.query as Partial<{ id: string }>;
    if (!id) {
      return;
    }
    refresh(id);
  }, [router.query]);

  return (
    <>
      <Head>
        <title>
          {profile ? profile.name || profile.original_name : "加载中..."}
        </title>
      </Head>
      <div className="min-h-screen">
        <div className="">
          {(() => {
            if (profile === null) {
              return null;
            }
            const { name, overview, backdrop_path, poster_path, episodes } =
              profile;
            return (
              <div className="relative">
                <div
                  className=""
                  style={{
                    backgroundImage: `url('${backdrop_path}')`,
                    backgroundSize: "auto",
                    // backgroundPosition: "left calc((50vw - 170px) - 340px) top",
                  }}
                >
                  <div
                    style={{
                      background:
                        "linear-gradient(to right, rgba(52.5, 157.5, 157.5, 1) calc((50vw - 170px) - 340px), rgba(52.5, 157.5, 157.5, 0.84) 50%, rgba(52.5, 157.5, 157.5, 0.84) 100%)",
                    }}
                  >
                    {/* <div className="absolute z-2 inset-0 backdrop-blur-lg w-full h-full" /> */}
                    <div className="relative z-3 space-y-4 m-auto w-[960px] py-8">
                      <div className="flex items-center">
                        <LazyImage
                          className="overflow-hidden w-[240px] rounded-lg mr-4 object-cover"
                          src={poster_path}
                        />
                        <div className="flex-1">
                          <h2 className="text-5xl">{name}</h2>
                          <div className="mt-6 text-2xl">剧情简介</div>
                          <div className="mt-2">{overview}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative z-3 m-auto w-[960px] py-8">
                  <div className="space-x-4">
                    <Button
                      onClick={() => {
                        set_visible(true);
                      }}
                    >
                      搜索 TMDB
                    </Button>
                    <TVFormDialog trigger={<Button>修改</Button>} />
                  </div>
                  <FolderMenu
                    options={[
                      {
                        label: "删除",
                        on_click() {
                          if (cur_episode_ref.current === null) {
                            return;
                          }
                          const episode = cur_episode_ref.current;
                          console.log(episode);
                        },
                      },
                    ]}
                  >
                    <div className="mt-8 space-y-4 ">
                      {episodes.map((episode) => {
                        const {
                          id,
                          file_name,
                          episode: episode_number,
                          season,
                          parent_paths,
                        } = episode;
                        return (
                          <div
                            key={id}
                            className="p-4 rounded-sm cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700"
                            onContextMenu={() => {
                              cur_episode_ref.current = episode;
                            }}
                          >
                            <p className="text-2xl">
                              {episode_number} - {season}
                            </p>
                            <p className="">{file_name}</p>
                            <p className="">{parent_paths}</p>
                          </div>
                        );
                      })}
                    </div>
                  </FolderMenu>
                </div>
              </div>
            );
          })()}
        </div>
        <TMDBSearcherDialog
          visible={visible}
          default_value={profile?.name}
          on_visible_change={set_visible}
          on_submit={async (searched_tv) => {
            const id = router.query.id as string;
            if (!id) {
              return Result.Err("No id");
            }
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
            refresh(id);
            set_visible(false);
            return Result.Ok(null);
          }}
        />
      </div>
    </>
  );
};

export default TVProfileInAdminPage;
