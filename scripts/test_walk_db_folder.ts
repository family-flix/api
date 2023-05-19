require("dotenv").config();

import { AliyunDriveFolder } from "@/domains/folder";
import { FolderWalker } from "@/domains/walker";
import { folder_client } from "@/store";
import { store } from "@/store";
import { parse_argv } from "@/utils/backend";

async function main() {
  const args = process.argv.slice(2);
  const options = parse_argv(args);
  const { drive_id, file_id, file_name } = options;
  if (!drive_id || !file_id || !file_name) {
    console.error("必须同时传入 drive_id、file_id 和 file_name");
    return;
  }
  const folder = new AliyunDriveFolder(file_id, {
    name: file_name,
    client: folder_client({ drive_id }, store),
  });
  const walker = new FolderWalker();
  walker.on_file = async (file) => {
    const { name } = file;
    console.log(name);
  };
  await walker.detect(folder);
  console.log("Complete");
}

main();
