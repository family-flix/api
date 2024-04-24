import fs from "fs";
import path from "path";

// import { MediaUpload, APIStore, request } from "./client.min";
import express from "express";
import { config } from "dotenv";

import { APIStore } from "@/domains/store/api";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { MediaUpload } from "@/domains/media_upload/index";
import { Drive } from "@/domains/drive/v2";
import { User } from "@/domains/user/index";
import { HttpClientCore } from "@/domains/http_client";
import { FileType } from "@/constants/index";
import { file_info } from "@/utils/fs";
import { search_media } from "@/domains/pt/mteam/services";
import { RequestCoreV2 } from "@/domains/request";
import { FileManage } from "@/domains/uploader/index";
import { MTeamPTClient } from "@/domains/pt/mteam";

/**
 * yarn esbuild store/nas.ts --platform=node --target=node12 --bundle --minify --outfile=dist/nas.js
 */
config();

let uid = 1;
const tasks: {
  uid: number;
  unique_id: string;
}[] = [];
function removeElementFromArray<T extends { unique_id: string }>(array: T[], unique_id: string) {
  const indexToRemove = array.findIndex((item) => item.unique_id === unique_id);
  if (indexToRemove !== -1) {
    array.splice(indexToRemove, 1);
  }
}

async function main() {
  // const args = process.argv.slice(2);
  // const options = MediaUpload.ParseArgv(args);
  // const { f } = options as { f: string };
  // if (!f) {
  //   console.error("请使用 -f 指定要上传的文件或文件夹");
  //   return;
  // }
  const token = process.env.USER_TOKEN;
  if (!token) {
    console.log("缺少环境变量 USER_TOKEN");
    return;
  }
  const ROOT_DIR = "/volume1/docker/transmission";
  const HOSTNAME = "https://media.funzm.com";
  const TARGET_DRIVE_ID = "2549939630";
  const store = new APIStore({
    // @todo 用 hostname 和不用，区别很大？服务端收不到 body 的区别？？？？？？
    // hostname: "http://127.0.0.1:3200",
    hostname: HOSTNAME,
    token,
  });
  const user_r = await User.New(token, store);
  if (user_r.error) {
    console.log(user_r.error.message);
    return;
  }
  const user = user_r.data;
  const client = store.client;
  const drive_id = TARGET_DRIVE_ID;
  const r = await MediaUpload.Get({
    drive_id,
    store,
  });
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  const uploader = r.data;
  const drive = uploader.drive;
  const drive_client = uploader.client;
  const parent_file_id = drive.root_folder_id;
  if (!parent_file_id) {
    console.log("云盘没有设置索引根目录");
    return;
  }
  uploader.on_print((v) => {
    console.log(v);
  });
  const mteam = new MTeamPTClient();
  const manage = new FileManage({ root: ROOT_DIR });
  const app = express();
  app.use(express.json());
  app.use(express.static(path.resolve(__dirname, "dist")));

  app.get("/api/ping", async (req, res) => {
    res.json({
      code: 0,
      msg: "success",
      data: null,
    });
  });
  app.post("/api/callback", async (req, res) => {
    const { f } = req.body;
    if (!f) {
      res.json({
        code: 101,
        msg: "请传入 f 参数",
        data: null,
      });
      return;
    }
    const filepath = (() => {
      if (path.isAbsolute(f)) {
        return f;
      }
      if (f.toString().includes("/transmission/downloads/complete")) {
        return path.resolve(f);
      }
      return path.resolve(ROOT_DIR, "./downloads/complete", f);
    })();
    const file_r = await file_info(filepath);
    if (file_r.error) {
      console.log(file_r.error.message);
      res.json({
        code: 101,
        msg: file_r.error.message,
        data: null,
      });
      return;
    }
    const stat = file_r.data;
    const existing_task = tasks.find((task) => task.unique_id === filepath);
    if (existing_task) {
      console.log(`${filepath} 该任务正在运行`);
      res.json({
        code: 101,
        msg: `${filepath} 该任务正在运行`,
        data: null,
      });
      return;
    }
    uid += 1;
    async function job(parent_file_id: string) {
      await uploader.upload(filepath, {
        parent_file_id,
      });
      console.log("start check has upload success before analysis drive");
      const file_in_drive_r = await drive_client.existing(parent_file_id, stat.name);
      if (file_in_drive_r.error) {
        console.log(file_in_drive_r.error.message);
        removeElementFromArray(tasks, filepath);
        res.json({
          code: 101,
          msg: file_in_drive_r.error.message,
          data: null,
        });
        return;
      }
      const file_in_drive = file_in_drive_r.data;
      if (file_in_drive === null) {
        console.log("上传完成后云盘中没有", stat.name);
        removeElementFromArray(tasks, filepath);
        res.json({
          code: 101,
          msg: `上传完成后云盘中没有 ${stat.name}`,
          data: {
            parent_file_id,
            name: stat.name,
          },
        });
        return;
      }
      const r = await client.post(`${HOSTNAME}/api/v2/admin/analysis/files`, {
        drive_id: drive.id,
        files: [
          {
            file_id: file_in_drive.file_id,
            name: file_in_drive.name,
            type: stat.file_type === "file" ? FileType.File : FileType.Folder,
          },
        ],
      });
      if (r.error) {
        console.log("索引失败", r.error.message);
        removeElementFromArray(tasks, filepath);
        res.json({
          code: 101,
          msg: r.error.message,
          data: null,
        });
        return;
      }
      console.log("开始索引", r.data);
      setTimeout(() => {
        removeElementFromArray(tasks, filepath);
      }, 10 * 1000);
    }
    job(parent_file_id);
    tasks.push({
      uid,
      unique_id: filepath,
    });
    res.json({
      code: 0,
      msg: "开始上传",
      data: null,
    });
  });
  app.post("/api/tasks", (req, res) => {
    res.json({
      code: 0,
      msg: "success",
      tasks: tasks.map((t) => {
        const { uid, unique_id } = t;
        return {
          uid,
          unique_id,
        };
      }),
    });
  });
  app.post("/api/mteam/search", async (req, res) => {
    const { page, page_size, keyword } = req.body;
    const r = await mteam.$search.run({ page, page_size, keyword });
    if (r.error) {
      res.json({
        code: 101,
        msg: r.error.message,
        data: null,
      });
      return;
    }
    res.json({
      code: 0,
      msg: "success",
      data: {
        page: Number(r.data.pageNumber),
        page_size: Number(r.data.pageSize),
        total: Number(r.data.total),
        list: r.data.data,
      },
    });
    return;
  });
  app.post("/api/mteam/download", async (req, res) => {
    const { id } = req.body;
    if (!id) {
      res.json({
        code: 101,
        msg: "缺少 id 参数",
        data: null,
      });
      return;
    }
    const r2 = await mteam.$profile.run(id);
    if (r2.error) {
      res.json({
        code: 101,
        msg: r2.error.message,
        data: null,
      });
      return;
    }
    const r = await mteam.$download.run(id);
    if (r.error) {
      res.json({
        code: 101,
        msg: r.error.message,
        data: null,
      });
      return;
    }
    const url = r.data;
    const r3 = await manage.download(url, path.resolve(ROOT_DIR, "watch", r2.data.originFileName), {
      is_fullpath: true,
      skip_existing: true,
    });
    if (r3.error) {
      res.json({
        code: 101,
        msg: r3.error.message,
        data: null,
      });
      return;
    }
    res.json({
      code: 0,
      msg: "success",
      data: null,
    });
    return;
  });
  app.listen(8001, "0.0.0.0", () => {
    console.log("server is listening at port 8001");
  });
}
main();
