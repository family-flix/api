require("dotenv").config();

import { TMDBClient } from "@/domains/media_profile/tmdb/index";

async function main() {
  if (!process.env.TMDB_TOKEN) {
    console.log("缺少 TMDB_TOKEN");
    return;
  }
  const client = new TMDBClient({
    token: process.env.TMDB_TOKEN,
  });
  const list_res = await client.search_tv("度华年");
  if (list_res.error) {
    console.log("搜索失败，因为", list_res.error.message);
    return;
  }
  const { data } = list_res;
  const matched = data.list[0];
  if (!matched) {
    console.log("没有匹配的记录");
    return;
  }
  const profile_res = await client.fetch_tv_profile(matched.id);
  if (profile_res.error) {
    console.log("获取详情失败，因为", profile_res.error.message);
    return;
  }
  const profile = profile_res.data;
  console.log(profile);
}

main();
