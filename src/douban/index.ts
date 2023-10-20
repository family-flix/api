require("dotenv").config();

import { DoubanClient } from "@/domains/media_profile/douban";
import axios from "axios";

async function main() {
  const client = new DoubanClient({
    token: process.env.DOUBAN_API_KEY,
  });
  const list_res = await client.search_tv("问心");
  if (list_res.error) {
    console.log("请求失败，因为", list_res.error.message);
    return;
  }
  console.log("请求成功");
  const { data } = list_res;
  console.log(data);
  // const response = await axios.get("https://frodo.douban.com/api/v2/search/weixin", {
  //   params: {
  //     q: "问心",
  //     start: "0",
  //     count: "20",
  //     apiKey: "0ac44ae016490db2204ce0a042db2916",
  //   },
  //   headers: {
  //     Host: "frodo.douban.com",
  //     Connection: "keep-alive",
  //     "content-type": "application/json",
  //     "User-Agent":
  //       "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.42(0x18002a2d) NetType/WIFI Language/en",
  //     Referer: "https://servicewechat.com/wx2f9b06c1de1ccfca/94/page-frame.html",
  //   },
  // });
  // console.log(response);
}

main();
