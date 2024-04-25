import { Application } from "@/domains/application";
import { MediaProfileClient } from "@/domains/media_profile";
import { DoubanClient } from "@/domains/media_profile/douban";

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
  const client = new DoubanClient({});
  //   const r1 = await client.search("曾少年");
  //   if (r1.error) {
  //     console.log(r1.error.message);
  //     return;
  //   }
  //   const results = r1.data.list;
  const r2 = await client.fetch_media_profile(26818236);
  if (r2.error) {
    console.log(r2.error.message);
    return;
  }
  console.log(r2.data);
  console.log("Success");
}

main();
