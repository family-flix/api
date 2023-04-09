import { useRouter } from "next/router";

import LazyImage from "@/components/LazyImage";
import ScrollView from "@/components/ScrollView";
import useHelper from "@/domains/list-helper-hook";
import { fetch_play_histories, PlayHistoryItem } from "@/services";
import { useEffect } from "react";
import Head from "next/head";

const UserPlayHistoryPage = () => {
  const router = useRouter();
  const [response, helper] = useHelper<PlayHistoryItem>(fetch_play_histories);

  useEffect(() => {
    helper.init();
  }, []);

  const { dataSource, loading, noMore, error } = response;

  return (
    <>
      <Head>
        <title>我的播放历史</title>
      </Head>
      <h2 className="h2 mt-8 pb-4 text-center">我的所有播放记录</h2>
      <ScrollView
        className=""
        {...response}
        onLoadMore={() => {
          helper.loadMore();
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {dataSource.map((history) => {
            const {
              id,
              name,
              original_name,
              poster_path,
              episode,
              season,
              updated,
              cur_episode_count,
              episode_count,
              has_update,
            } = history;
            return (
              <div
                key={id}
                className="flex m-4 cursor-pointer"
                onClick={() => {
                  router.push(`/play/${id}`);
                }}
              >
                <div className="relative mr-4">
                  <LazyImage
                    className="w-[120px] object-cover"
                    src={poster_path}
                    alt={name || original_name}
                  />
                  {(() => {
                    if (episode_count && cur_episode_count !== episode_count) {
                      return (
                        <div className="absolute top-1 left-1">
                          <div className="inline-flex items-center py-1 px-2 rounded-sm bg-green-300 dark:bg-green-800">
                            <div className="text-[12px] leading-none text-gray-800 dark:text-gray-300 ">
                              更新到第{cur_episode_count}集
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
                <div className="relative flex-1 max-w-sm overflow-hidden text-ellipsis">
                  <h2 className="text-2xl">{name}</h2>
                  <div className="flex items-center mt-2 text-xl">
                    <p className="">{episode}</p>
                    <p className="mx-2 text-gray-500">·</p>
                    <p className="text-gray-500">{season}</p>
                  </div>
                  <div className="mt-2">{updated} 看过</div>
                  <div className="flex items-center mt-4 space-x-2">
                    {(() => {
                      const nodes: React.ReactNode[] = [];
                      if (has_update) {
                        nodes.push(
                          <div className="inline-flex items-center py-1 px-2 rounded-sm bg-green-300 dark:bg-green-800">
                            <div className="text-[14px] leading-none text-gray-800 dark:text-gray-300 ">
                              在你看过后有更新
                            </div>
                          </div>
                        );
                      }
                      return nodes;
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollView>
    </>
  );
};

export default UserPlayHistoryPage;
