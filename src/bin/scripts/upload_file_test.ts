require("dotenv").config();
import { qiniu_upload_online_file } from "@/utils/upload";

async function run() {
  const r = await qiniu_upload_online_file("https://static.imgcook.com/img/test/91b90cb0b4fe11ed80b0a151e0cfbe29.jpg");
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data);
}

run();
