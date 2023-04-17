require("dotenv").config();
import {
  find_first_matched_tv_of_tmdb,
  search_tv_in_tmdb,
} from "@/domains/walker/utils";

async function main() {
  const res = await find_first_matched_tv_of_tmdb("甄嬛传", {
    token: process.env.TMDB_TOKEN,
  });
  if (res.error) {
    console.log("failed", res.error.message);
    return;
  }
  console.log(res.data);
}

main();
