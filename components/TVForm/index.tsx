/**
 * @file TV 表单
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
import { Textarea } from "@/components/ui/textarea";

interface IProps {
  on_submit?: (v: MatchedTVOfTMDB) => void;
}
const TVForm: React.FC<IProps> = (props) => {
  const { on_submit } = props;
  const [values, set_values] = useState({
    name: "",
    poster_path: "",
  });

  return (
    <div>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-12 items-center gap-4">
          <Label className="col-span-2 text-right">名称</Label>
          <Input
            className="col-span-10"
            value={values.name}
            placeholder="请输入名称"
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
          <Label className="col-span-2 text-right">简介</Label>
          <Textarea
            className="col-span-10"
            value={values.name}
            placeholder="请输入名称"
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
      </div>
    </div>
  );
};

export default TVForm;
