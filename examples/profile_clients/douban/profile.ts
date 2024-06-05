import { MediaTypes } from "@/constants";
import { DoubanClient } from "@/domains/media_profile/douban";

async function main() {
  console.log("Start");
  const $douban = new DoubanClient({});
  const client = $douban;
  const profile_r = await client.fetch_media_profile("35856096");
  if (profile_r.error) {
    console.log(`获取详情失败，因为 ${profile_r.error.message}`);
    return;
  }
  const profile = profile_r.data;
  console.log(profile);
  console.log("Success");
}

main();
