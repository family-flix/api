/**
 * @file 首页
 */
import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Search } from "lucide-react";

import WebsiteFooter from "@/layouts/site/footer";
import LazyImage from "@/components/LazyImage";
import ScrollView from "@/components/ScrollView";
import useHelper from "@/domains/list-helper-hook";
import {
  fetch_play_histories,
  fetch_recommended_tvs,
  fetch_tv_list,
  PlayHistoryItem,
  TVItem,
} from "@/services";
import { user } from "@/domains/user";

export default function Home() {
  const [response, helper] = useHelper<TVItem>(fetch_tv_list);
  const [recommended_response, recommended_helper] = useHelper<TVItem>(
    fetch_recommended_tvs
  );
  const [history_response, history_helper] = useHelper<PlayHistoryItem>(
    fetch_play_histories,
    {
      pageSize: 6,
    }
  );
  const router = useRouter();
  const query = router.query as { token?: string };
  const member_token_ref = useRef("");

  useEffect(() => {
    const { token } = query;
    // console.log("[PAGE]index - token is", token);
    if (token) {
      member_token_ref.current = token;
    }
  }, [query]);
  useEffect(() => {
    setTimeout(async () => {
      const token = member_token_ref.current;
      if (token) {
        const r = await user.login_in_member(token);
        if (r.error) {
          return;
        }
        recommended_helper.init();
      }
      if (!user.is_login) {
        console.log("need login", user);
        // router.replace("/intro");
        alert("请先登录");
        return;
      }
      history_helper.init();
      helper.init();
      // 延迟 500 毫秒是因为即使带着 ?token 访问，也一定会有一次没有 token 的情况
    }, 500);
  }, []);

  const { dataSource, initial, loading, noMore, error } = response;

  if (error && dataSource.length === 0) {
    return (
      <div className="center center--top">
        <div className="text-3xl text-gray-300">
          Opts, the website is went wrong
        </div>
      </div>
    );
  }

  // if (initial) {
  //   return (
  //     <main>
  //       <div className="mt-8">
  //         <h2 className="h2 text-center">所有影片</h2>
  //         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
  //           <div className="m-4 cursor-pointer">
  //             <div className="w-full min-h-[384px] object-cover" />
  //             <div className="mt-4 max-w-sm overflow-hidden text-ellipsis">
  //               <h2 className="truncate text-2xl w-36"></h2>
  //               <div className="">
  //                 <p className="truncate w-72"></p>
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </main>
  //   );
  // }

  return (
    <main>
      <Head>
        <title>影视剧列表</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="description" content="影视剧在线观看" />
        <meta name="referrer" content="no-referrer" />
      </Head>
      <div className="pt-4">
        {(() => {
          const { dataSource } = history_response;
          if (dataSource.length === 0) {
            return null;
          }
          return (
            <div className="mt-4 overflow-hidden">
              <h2 className="h2 pb-4 text-center">最近播放</h2>
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
                          if (
                            episode_count &&
                            cur_episode_count !== episode_count
                          ) {
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
                            if (has_update) {
                              return (
                                <div className="inline-flex items-center py-1 px-2 rounded-sm bg-green-300 dark:bg-green-800">
                                  <div className="text-[14px] leading-none text-gray-800 dark:text-gray-300 ">
                                    在你看过后有更新
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className="my-6 text-gray-300 text-center"
                onClick={() => {
                  router.push("/history");
                }}
              >
                点击查看所有播放记录
              </div>
            </div>
          );
        })()}
        {(() => {
          const { dataSource } = recommended_response;
          if (dataSource.length === 0) {
            return null;
          }
          return (
            <div className="mt-4 overflow-hidden">
              <h2 className="h2 pb-4 text-center">推荐</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {dataSource.map((tv) => {
                  const {
                    id,
                    name,
                    original_name,
                    overview,
                    poster_path = "",
                  } = tv;
                  return (
                    <div
                      key={id}
                      className="m-4 cursor-pointer"
                      onClick={() => {
                        router.push(`/play/${id}`);
                      }}
                    >
                      <LazyImage
                        className="w-full min-h-[384px] object-cover"
                        src={poster_path}
                        alt={name || original_name}
                      />
                      <div className="mt-4 max-w-sm overflow-hidden text-ellipsis">
                        <h2 className="truncate text-2xl">{name}</h2>
                        <div className="">
                          <p className="truncate">{overview}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        <ScrollView
          className="mt-4 overflow-hidden"
          {...response}
          onLoadMore={() => {
            if (!user.is_login) {
              return;
            }
            helper.loadMore();
          }}
        >
          <h2 className="h2 pb-4 text-center">所有影片</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {(() => {
              if (initial) {
                return (
                  <div className="w-[320px] mx-auto">
                    <div className="m-4 cursor-pointer">
                      <LazyImage className="w-full h-[524px] bg-gray-200 object-cover dark:bg-gray-800" />
                      <div className="mt-4 max-w-sm overflow-hidden text-ellipsis">
                        <h2 className="w-[256px] h-[32px] bg-gray-200 truncate text-2xl dark:bg-gray-800"></h2>
                        <div className="mt-4">
                          <p className="w-[375px] h-[24px] bg-gray-200 truncate dark:bg-gray-800"></p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return dataSource.map((tv) => {
                const {
                  id,
                  name,
                  original_name,
                  overview,
                  poster_path = "",
                } = tv;
                return (
                  <div
                    key={id}
                    className="m-4 cursor-pointer"
                    onClick={() => {
                      router.push(`/play/${id}`);
                    }}
                  >
                    <LazyImage
                      className="w-full min-h-[384px] object-cover"
                      src={poster_path}
                      alt={name || original_name}
                    />
                    <div className="mt-4 max-w-sm overflow-hidden text-ellipsis">
                      <h2 className="truncate text-2xl">{name}</h2>
                      <div className="">
                        <p className="truncate">{overview}</p>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </ScrollView>
      </div>
      <div className="fixed right-8 bottom-4 xl:right-12 xl:bottom-12">
        <div
          className="flex items-center justify-center bg-gray-100 rounded-full cursor-pointer w-12 h-12 xl:w-24 xl:h-24 dark:bg-gray-800"
          onClick={() => {
            router.push("/search");
          }}
        >
          <Search className="w-4 h-4 text-gray-800 xl:w-12 xl:h-12 dark:text-gray-100" />
        </div>
      </div>
      {/* <div className="fixed bottom-12">
        <LongPressInput />
      </div> */}
      <WebsiteFooter />
    </main>
  );
}
