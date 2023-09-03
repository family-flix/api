import { Drive } from "@/domains/drive";
import { MediaSearcher } from "@/domains/searcher";
import { User } from "@/domains/user";
import { app, store } from "@/store";

async function main(tmdb_id: number) {
  const token =
    "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..zK7MzJfx4OdRSnV-.6E1HKT1MUYS0vvY7Y4k-txmsWkd3_rczahQ5gPPoub2uvP692v1NfrJs1nBRutaDwQbCNfmmeiD-gkAu3IBTxbYzFAAQx_AOhnZqNlvgCB4tm0Bt1tqH0A2jJw-d6t08DqWf6SXzdw.SPScom4lIIrEmuE7-UOlnw";
  const t_res = await User.New(token, store);
  if (t_res.error) {
    return;
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id: "FxamFUFJ81GTiX7", user_id: user.id, store });
  if (drive_res.error) {
    return;
  }
  const drive = drive_res.data;
  const searcher_res = await MediaSearcher.New({
    user,
    drive,
    tmdb_token: user.settings.tmdb_token,
    assets: app.assets,
    store,
  });
  if (searcher_res.error) {
    return;
  }
  const searcher = searcher_res.data;
  const r = await searcher.get_tv_profile_with_tmdb_id({ tmdb_id });
  if (r.error) {
    console.log("get_tv_profile_with_tmdb_id failed", r.error.message);
    return;
  }
  console.log(r.data);
}

const id = 124364;
main(id);
// delete_tv_profile(id);
