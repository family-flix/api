import { MediaTypes } from "@/constants";
import { Application } from "@/domains/application";
import { MediaProfileClient } from "@/domains/media_profile";
import { DoubanClient } from "@/domains/media_profile/douban";

async function main() {
  console.log("Start");
  const $douban = new DoubanClient({});
  const client = $douban;
  const name = "银河写手";
  const r = await client.search(name);
  if (r.error) {
    console.log("search failed, because", r.error.message);
    return;
  }
  console.log(r.data.list);
  const rr = await client.match_exact_media(
    { type: MediaTypes.Movie, name, original_name: null, order: 1, air_date: null },
    r.data.list
  );
  if (rr.error) {
    console.log("fetch profile failed, because", rr.error.message);
    return;
  }
  console.log(rr.data);
  console.log("Success");
}

main();
