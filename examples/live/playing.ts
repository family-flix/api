import axios from "axios";
import { Application } from "@/domains/application/index";

async function main() {
  // const url = "https://pullsstv90080111.ssws.tv/live/SSTV20220729.m3u8";
  // const r = await axios.get(url);
  // console.log(r.data);
  console.log(process.env);
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
}

main();
