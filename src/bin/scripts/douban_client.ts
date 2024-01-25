// @ts-nocheck
import { MediaTypes } from "@/constants";
import { Application } from "@/domains/application";
import { MediaProfileClient } from "@/domains/media_profile";
import { ScheduleTask } from "@/domains/schedule/v2";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { parseJSONStr, r_id } from "@/utils";

async function main() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  console.log("Start");
  const profile_r = await MediaProfileClient.New({
    token: "c2e5d34999e27f8e0ef18421aa5dec38",
    assets: app.assets,
    store,
  });
  if (profile_r.error) {
    console.log(profile_r.error.message);
    return;
  }
  const client = profile_r.data;
  const r = await client.$douban.search("老友记 3");
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data.list);
  const rr = await client.$douban.match_exact_media(
    { type: MediaTypes.Season, name: "老友记", original_name: "Friends", order: 3 },
    r.data.list
  );
  if (rr.error) {
    console.log(rr.error.message);
    return;
  }
  console.log(rr.data);
  console.log("Success");
}

main();
