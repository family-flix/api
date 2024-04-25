// @ts-nocheck
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
  const media_profile = await store.prisma.media_profile.findFirst({
    where: {
      name: {
        contains: "西区故事",
      },
    },
    include: {
      series: true,
    },
  });
  if (!media_profile) {
    console.log("没有匹配的记录");
    return;
  }
  await store.prisma.person_in_media.deleteMany({
    where: {
      media_id: media_profile.id,
    },
  });
  const r = await client.refresh_profile_with_douban_id(media_profile, {
    douban_id: 26820621,
  });
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log("Success");
}

main();
