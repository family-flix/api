import fs from "fs";
import path from "path";

// import { MediaUpload, APIStore, request } from "./client.min";

import { APIStore } from "@/domains/store/api";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { MediaUpload } from "@/domains/media_upload/index";
import { Drive } from "@/domains/drive/v2";
import { User } from "@/domains/user/index";
import { FileType } from "@/constants/index";
import { file_info } from "@/utils/fs";

/**
 * yarn esbuild store/nas.ts --platform=node --target=node12 --bundle --minify --outfile=dist/nas.js
 */

async function main() {
  const args = process.argv.slice(2);
  const options = MediaUpload.ParseArgv(args);
  const { f } = options as { f: string };
  if (!f) {
    console.error("请使用 -f 指定要上传的文件或文件夹");
    return;
  }
  const token = "";
  const store = new APIStore({
    // @todo 用 hostname 和不用，区别很大？服务端收不到 body 的区别？？？？？？
    // hostname: "http://127.0.0.1:3200",
    hostname: "https://media.funzm.com",
    token,
  });
  const user_r = await User.New(token, store);
  if (user_r.error) {
    console.log(user_r.error.message);
    return;
  }
  const user = user_r.data;
  // const user: {
  //   id: string;
  //   settings: {
  //     tmdb_token: string;
  //   };
  //   get_filename_rules(): {
  //     replace: [string, string];
  //   }[];
  //   get_ignore_files(): string[];
  // } = {
  //   id: "123",
  //   settings: {
  //     tmdb_token: "",
  //   },
  //   get_filename_rules() {
  //     return [];
  //   },
  //   get_ignore_files() {
  //     return [];
  //   },
  // };
  const drive_id = "2179049630";
  // const drive_id = "2243978430";
  const r0 = await Drive.Get({ unique_id: drive_id, user, store });
  if (r0.error) {
    console.log(r0.error.message);
    return;
  }
  const drive = r0.data;
  const parent_file_id = drive.profile.root_folder_id;
  if (!parent_file_id) {
    console.log("云盘没有设置索引根目录");
    return;
  }
  const r = await MediaUpload.Get({
    drive_id,
    store,
  });
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  const uploader = r.data;
  uploader.on_print((v) => {
    console.log(v);
  });
  const filepath = (() => {
    if (path.isAbsolute(f)) {
      return f;
    }
    if (f.toString().includes("/transmission/downloads/complete")) {
      return path.resolve(f);
    }
    return path.resolve("/volume1/docker/transmission/downloads/complete", f);
  })();
  const file_r = await file_info(filepath);
  if (file_r.error) {
    console.log(file_r.error.message);
    return;
  }
  const stat = file_r.data;
  const r2 = await uploader.upload(filepath, {
    parent_file_id,
  });
  if (r2.error) {
    console.log(r2.error.message);
    return;
  }
  const file_in_drive_r = await drive.client.existing(parent_file_id, stat.name);
  if (file_in_drive_r.error) {
    console.log(file_in_drive_r.error.message);
    return;
  }
  const file_in_drive = file_in_drive_r.data;
  if (file_in_drive === null) {
    console.log("云盘中没有", stat.name);
    return;
  }
  const r3 = await DriveAnalysis.New({
    drive,
    store,
    user,
    assets: "/apps/flix_prod/storage",
  });
  if (r3.error) {
    console.log(r3.error.message);
    return;
  }
  const analysis = r3.data;
  analysis.on_percent((percent) => {
    console.log(percent);
  });
  async function run(file: { file_id: string; name: string; type: FileType }) {
    const the_files_prepare_analysis = [file].map((f) => {
      const { file_id, name, type } = f;
      return {
        file_id,
        type,
        name,
      };
    });
    const r = await analysis.run2(the_files_prepare_analysis, { force: true });
    if (r.error) {
      console.log("刮削失败", r.error.message);
      return;
    }
    console.log("刮削结束");
  }
  //   run({
  //     file_id: file_in_drive.file_id,
  //     name: file_in_drive.name,
  //     type: stat.file_type === "file" ? FileType.File : FileType.Folder,
  //   });
}
main();
