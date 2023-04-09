/**
 * @file TMDB 搜索器
 */
import { useState } from "react";

import useHelper from "@/domains/list-helper-hook";
import { MatchedTVOfTMDB, search_tv_in_tmdb } from "@/services";
import LazyImage from "@/components/LazyImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ScrollView from "@/components/ScrollView";

interface IProps {
  default_keyword?: string;
  on_submit?: (v: MatchedTVOfTMDB) => void;
}
const TMDBSearcher: React.FC<IProps> = (props) => {
  const { default_keyword = "", on_submit } = props;
  const [values, set_values] = useState({
    name: default_keyword,
    language: "zh-CN",
  });
  const [response, helper] = useHelper<MatchedTVOfTMDB>(search_tv_in_tmdb);

  const { dataSource, loading, noMore, error } = response;

  return (
    <div>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-12 items-center gap-4">
          <Label className="col-span-2 text-right">名称</Label>
          <Input
            className="col-span-10"
            value={values.name}
            placeholder="请输入电影/电视剧名称"
            onChange={(event) => {
              set_values((prev) => {
                return {
                  ...prev,
                  name: event.target.value,
                };
              });
            }}
          />
        </div>
        <div className="grid grid-cols-12 items-center gap-4">
          <Label className="col-span-2 text-right">语言</Label>
          <Select>
            <SelectTrigger className="col-span-4">
              <SelectValue placeholder="选择语言" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">中文</SelectItem>
              <SelectItem value="dark">English</SelectItem>
            </SelectContent>
          </Select>
          <Label className="col-span-1 text-right">类型</Label>
          <Select>
            <SelectTrigger className="col-span-5">
              <SelectValue placeholder="选择搜索类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">电影</SelectItem>
              <SelectItem value="dark">电视剧</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-12">
          <div className="col-span-2" />
          <Button
            className="col-span-2"
            onClick={async () => {
              const { name } = values;
              helper.search({ keyword: name });
            }}
          >
            搜索
          </Button>
        </div>
      </div>
      <ScrollView
        className="overflow-y-auto max-h-[480px] p-2 space-y-4"
        {...response}
      >
        {dataSource.map((r) => {
          const { id, name, original_name, overview, poster_path } = r;
          return (
            <div key={id} className="card flex">
              <LazyImage
                className="w-[120px] rounded-sm object-fit mr-4"
                src={poster_path}
                alt={name || original_name}
              />
              <div className="flex-1">
                <div className="text-2xl">{name || original_name}</div>
                <div>{overview}</div>
                <div className="mt-4">
                  <Button
                    className="btn btn--primary"
                    onClick={() => {
                      if (on_submit) {
                        on_submit(r);
                      }
                    }}
                  >
                    确定
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </ScrollView>
    </div>
  );
};

export default TMDBSearcher;
