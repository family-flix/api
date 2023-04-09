import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import useHelper from "@/domains/list-helper-hook";
import { fetch_tv_list } from "@/services";
import LazyImage from "@/components/LazyImage";
import { PartialSearchedTV } from "@/domains/tmdb/services";
import Head from "next/head";
import ScrollView from "@/components/ScrollView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TVSearchResultPage = () => {
  const router = useRouter();
  const { query } = router;
  const [response, helper] = useHelper<PartialSearchedTV>(fetch_tv_list);
  const [name, set_name] = useState(query.name);

  useEffect(() => {
    if (!query.name) {
      return;
    }
    helper.search(query);
  }, [query]);

  const { dataSource, loading, error, noMore } = response;

  return (
    <>
      <Head>
        <title>影视剧列表 - 搜索结果</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </Head>
      <div className="min-h-screen max-w-screen p-4 pt-8">
        <div className="m-auto space-y-2">
          <div className="">
            <h2 className="h2 mt-4 pb-4 text-center">搜索结果</h2>
            <div className="flex mt-4 space-x-2">
              <Input
                className=""
                placeholder="请输入名称搜索"
                value={name}
                onChange={(event) => {
                  set_name(event.target.value);
                }}
              />
              <Button
                className="w-[80px]"
                onClick={() => {
                  if (!name) {
                    return;
                  }
                  helper.search({ name });
                }}
              >
                搜索
              </Button>
            </div>
          </div>
          <ScrollView
            {...response}
            onLoadMore={() => {
              helper.loadMore();
            }}
          >
            <div className="space-y-4">
              {dataSource.map((t) => {
                const { id, name, original_name, overview, poster_path } = t;
                return (
                  <div
                    key={id}
                    className="flex m-4 cursor-pointer"
                    onClick={() => {
                      router.push(`/play/${id}`);
                    }}
                  >
                    <LazyImage
                      className="w-[120px] mr-4 object-cover"
                      src={poster_path}
                      alt={name || original_name}
                    />
                    <div className="flex-1 max-w-sm overflow-hidden text-ellipsis">
                      <h2 className="truncate text-xl">{name}</h2>
                      <div className="mt-2">
                        <p className="text-sm break-all whitespace-pre-wrap truncate line-clamp-6">
                          {overview}
                        </p>
                      </div>
                    </div>
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

export default TVSearchResultPage;
