/**
 * @file 解析出认为是电视剧，但无法根据解析出的名字在 TMDB 找到结果的电视剧
 */
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

import { RequestedResource, Result } from "@/types";
import { request } from "@/utils/request";
import { parse_filename_for_video } from "@/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { TVFormDialog } from "@/components/TVForm/dialog";
import { TMDBSearcherDialog } from "@/components/TMDBSearcher/dialog";
import { bind_searched_tv_for_tv } from "@/services";

async function fetch_unknown_tv_profile(body: { tv_id: string }) {
  const { tv_id } = body;
  const r = await request.get<{
    id: string;
    name: string;
    original_name: string;
    episodes: {
      id: string;
      episode: string;
      season: string;
      parent_paths: string;
      file_name: string;
    }[];
  }>(`/api/admin/unknown_tv/${tv_id}`);
  return r;
}
type UnknownTVProfile = RequestedResource<typeof fetch_unknown_tv_profile>;

const UnknownTVProfileInAdminPage = () => {
  const [profile, set_profile] = useState<UnknownTVProfile | null>(null);
  const [parsed_result, set_parsed_result] = useState<
    Record<
      string,
      {
        name: string;
        episode: string;
        parent_paths: {
          name: string;
          season: string;
        }[];
      }
    >
  >({});
  const [visible, set_visible] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const refresh = useCallback(async (id: string) => {
    const r = await fetch_unknown_tv_profile({ tv_id: id });
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
      <div className="min-h-screen pt-8 pb-8">
        <div className="m-auto w-[960px] space-y-4">
          <h2 className="h2 w-full mt-4 break-all whitespace-pre-wrap">
            {profile ? profile.name || profile.original_name : "加载中..."}
          </h2>
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
          {(() => {
            if (profile === null) {
              return null;
            }
            const { name, episodes } = profile;
            return (
              <div className="space-y-4">
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
                      className=""
                      onClick={() => {
                        const parsed = {
                          ...parse_filename_for_video(file_name, [
                            "name",
                            "episode",
                          ]),
                          parent_paths: parent_paths.split("/").map((p) => {
                            const r = parse_filename_for_video(p, [
                              "name",
                              "season",
                            ]);
                            return r;
                          }),
                        };
                        set_parsed_result((prev) => {
                          return {
                            ...prev,
                            [id]: parsed,
                          };
                        });
                      }}
                    >
                      <p className="text-xl">
                        {episode_number} - {season}
                      </p>
                      <p className="">{file_name}</p>
                      <p className="">{parent_paths}</p>
                      <div className="p-4 dark:bg-gray-600">
                        {(() => {
                          const matched = parsed_result[id];
                          if (!matched) {
                            return null;
                          }
                          return (
                            <div>
                              {matched.name}
                              <div>
                                {matched.parent_paths.map((p, i) => {
                                  return (
                                    <div key={i}>
                                      {p.name}
                                      {p.season}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
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

export default UnknownTVProfileInAdminPage;
