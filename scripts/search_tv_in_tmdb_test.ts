require("dotenv").config();
import { search_tv_in_tmdb } from "@/domains/walker/utils";

async function main() {
  await search_tv_in_tmdb(
    {
      name: "甄嬛传",
      original_name: "",
    },
    {
      token: process.env.TMDB_TOKEN,
    }
  );
  console.log("完成");
}

main();
