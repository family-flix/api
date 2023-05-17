require("dotenv").config();
import {
  find_first_matched_tv_from_tmdb,
  get_tv_profile_with_tmdb,
} from "@/domains/walker/utils";

async function main() {
  const res = await find_first_matched_tv_from_tmdb("甄嬛传", {
    token: process.env.TMDB_TOKEN,
  });
  if (res.error) {
    console.log("failed", res.error.message);
    return;
  }
  console.log(res.data);
}

main();
