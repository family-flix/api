/**
 * @file 遍历数据库中的 folder 表
 */
require("dotenv").config();

import { Folder } from "@/domains/folder";
import { FolderWalker } from "@/domains/walker";
import { folder_client } from "@/domains/store/utils";
import { store } from "@/store";

async function main() {
  const drive_folder = {
    id: "l30jXciQvfhB3Su",
    file_id: "6423ca44ff020212a6a54cfdbd8c392bb4a1bb8f",
    // file_name: "Season 1",
  };
  const drive_id = drive_folder.id;
  const prev_folder = new Folder(drive_folder.file_id, {
    // name: drive_folder.file_name,
    client: folder_client({ drive_id }, store),
  });
  const r = await prev_folder.profile();
  if (r.error) {
    console.log("[]fetch folder profile failed", r.error.message);
    return;
  }
  const walker = new FolderWalker({});
  walker.on_file = async (file) => {
    console.log(file);
  };
  await walker.run(prev_folder);
}
main();

async function main2() {
  // const sql = `SELECT * FROM folder WHERE parent_file_id = '63f5fe2622ae48f3abb44c42bf542b04524cfe8d' AND drive_id = 'l30jXciQvfhB3Su' ORDER BY name DESC LIMIT 21`;
  // const r = await store.operation.all(sql);
  // if (r.error) {
  //   console.log(r.error.message);
  //   return;
  // }
  // console.log(r.data);
}
// main2();
