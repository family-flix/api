import os from "os";
import path from "path";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { Application } from "@/domains/application";
import { Folder } from "@/domains/folder";
import { folder_client } from "@/domains/store/utils";
import { MockFileClient } from "@/domains/clients/mock";
// import { data, id } from "@/mock/xu_ni_wan_jia_deng_huo";
import { Result } from "@/types";

(async () => {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  const original_drive_res = await AliyunDriveClient.Get({ drive_id: "625667282", store });
  if (original_drive_res.error) {
    console.log(original_drive_res.error.message);
    return;
  }
  const original_client = original_drive_res.data;
  const video_filepath = path.resolve(os.homedir(), "Downloads", "output.mp4");
  // const folder = new Folder("65a39f93f0f55618c47a441aa406f59c5efd9e75", {
  //   client: original_client,
  // });
  // const r = await folder.walk(async (file) => {
  //   const { name, type, parents, mime_type } = file;
  //   const filepath = [...parents].map((p) => p.name).join("/");
  //   if (type === "file" && mime_type?.includes("video")) {
  //     console.log("\n");
  //     console.log("filepath: ", filepath);
  //     console.log("name: ", name);
  //     await original_client.upload(video_filepath, {
  //       name: [filepath, name].join("/"),
  //       parent_file_id: "65a49ebae33fc9fe9f554362aa556130b4887ba8",
  //     });
  //   }
  //   return true;
  // });
  // if (r.error) {
  //   console.log(r.error.message);
  //   return;
  // }
  // const folder = new Folder("63fef6384b033675d1c9433b9a995f73993a5e74", {
  //   // @ts-ignore
  //   client: new MockFileClient({ data }),
  // });
  // const r = await folder.walk(async (file) => {
  //   const { name, type, parents, mime_type } = file;
  //   const filepath = [...parents].map((p) => p.name).join("/");
  //   if (type === "file" && name.endsWith(".mp4")) {
  //     console.log("\n");
  //     console.log("filepath: ", filepath);
  //     console.log("name: ", name);
  //     await original_client.upload(video_filepath, {
  //       name: [filepath, name].join("/"),
  //       parent_file_id: "65a49ebae33fc9fe9f554362aa556130b4887ba8",
  //     });
  //   }
  //   return true;
  // });
  // if (r.error) {
  //   console.log(r.error.message);
  //   return;
  // }
  console.log("Completed");
})();

function upload() {
  // const existing = await original_client.existing(
  //   "65a39f93f0f55618c47a441aa406f59c5efd9e75",
  //   [
  //     "2006.地球脉动.1-2季",
  //     "地球脉动第2季",
  //     "地球脉动第二季",
  //     "Planet.Earth.II.S01E01.2160p.UHD.BluRay.HDR.DTS-HD.MA5.1.x265-ULTRAHDCLUB.mkv",
  //   ].join("/")
  // );
  // console.log(existing);
  // await original_client.upload(video_filepath, {
  //   name: ["Planet.Earth.II.S01E02.2160p.UHD.BluRay.HDR.DTS-HD.MA5.1.x265-ULTRAHDCLUB.mkv"].join("/"),
  //   parent_file_id: "65a49ebae33fc9fe9f554362aa556130b4887ba8",
  // });
}
function rename() {
  // 01 65a4e6ebada209e63e964b2088ea2173e95a864c
  // 02 65a4e6f152a77e3053624decb1c0f816fa12f304
  // const r = await original_client.rename_file("65a4e6f152a77e3053624decb1c0f816fa12f304", "test01.mkv", {
  //   check_name_mode: "ignore",
  // });
  // if (r.error) {
  //   console.log(r.error.message);
  //   return;
  // }
}
