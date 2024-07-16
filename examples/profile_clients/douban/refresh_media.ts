import { Application } from "@/domains/application";
import { User } from "@/domains/user";
import { MediaProfileClient } from "@/domains/media_profile";
import { DoubanClient } from "@/domains/media_profile/douban";
import { MediaTypes } from "@/constants";

async function main() {
  console.log("Start");
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
    env: process.env,
  });
  const store = app.store;
  const a = await store.prisma.user.findFirst({});
  if (!a) {
    console.log("no user");
    return;
  }
  const t_r = await User.Get({ id: a.id }, store);
  if (t_r.error) {
    return;
  }
  const user = t_r.data;
  const name = "无所畏惧";
  const media = await store.prisma.media_profile.findFirst({
    where: {
      name,
    },
    include: {
      series: true,
    },
  });
  if (media === null) {
    console.log("没有匹配的记录");
    return;
  }
  const client_res = await MediaProfileClient.New({
    tmdb: { token: user.settings.tmdb_token },
    assets: app.assets,
    store,
  });
  if (client_res.error) {
    console.log(client_res.error.message);
    return;
  }
  const client = client_res.data;
  client.$douban.debug = true;
  const r = await client.refresh_profile_with_douban(media);
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data);
  console.log("Success");
}

main();
