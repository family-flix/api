import { useEffect, useState } from "react";

import ScrollView from "@/components/ScrollView";
import useHelper from "@/domains/list-helper-hook";
import { fetch_tv_list } from "@/services";
import LazyImage from "@/components/LazyImage";
import { PartialSearchedTV } from "@/domains/tmdb/services";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TVSelect = (props: { on_change: (tv: PartialSearchedTV) => void }) => {
  const { on_change } = props;
  const [response, helper] = useHelper<PartialSearchedTV>(fetch_tv_list, {
    pageSize: 1,
  });
  const [name, set_name] = useState("");
  const [selected_tv, set_selected_tv] = useState<PartialSearchedTV | null>(
    null
  );

  useEffect(() => {
    //     helper.init();
  }, []);

  const { dataSource } = response;

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-3">
          <Input
            placeholder="请输入名称进行查询"
            value={name}
            onChange={(event) => {
              set_name(event.target.value);
            }}
          />
        </div>
        <Button
          className="col-span-1"
          onClick={() => {
            helper.search({ name });
          }}
        >
          查询
        </Button>
      </div>
      <ScrollView
        className="mt-4"
        {...response}
        onLoadMore={() => {
          helper.loadMore();
        }}
      >
        <div className="space-y-4">
          {dataSource.map((tv) => {
            const { id, name, original_name, overview, poster_path } = tv;
            return (
              <div
                key={id}
                className={cn(
                  "card border cursor-pointer",
                  selected_tv?.id === id ? "border-green-500" : ""
                )}
                onClick={() => {
                  set_selected_tv(tv);
                  if (on_change) {
                    on_change(tv);
                  }
                }}
              >
                <div className="flex">
                  <LazyImage
                    className="w-[180px] overflow-hidden rounded-sm mr-4"
                    src={poster_path}
                    alt={name || original_name}
                  />
                  <div className="flex-1">
                    <div className="text-2xl">{name || original_name}</div>
                    <div>{overview}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollView>
    </div>
  );
};

export default TVSelect;
