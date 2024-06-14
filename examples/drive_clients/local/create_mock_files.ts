/**
 * @file 给指定盘添加测试用的文件，模拟真实文件树
 * 数据参考 readme.md
 */
import path from "path";
import os from "os";

import { Application } from "@/domains/application/index";
import { Folder } from "@/domains/folder/index";
import { FileManage } from "@/domains/uploader";
import { AliyunDriveClient } from "@/domains/clients/alipan";
import { DriveTypes } from "@/domains/drive/constants";
import { LocalFileDriveClient } from "@/domains/clients/local";
import { AliyunShareResourceClient } from "@/domains/clients/aliyun_resource/index";
import { is_img_file, is_nfo_file, is_subtitle_file, is_video_file } from "@/utils/index";

const template_mp4_video = path.resolve(process.cwd(), "public/template_video.mp4");
const template_mkv_video = path.resolve(process.cwd(), "public/template_video.mkv");
// const template_img = path.resolve(process.cwd(), "public/template_img.jpg");
// const template_episode = path.resolve(process.cwd(), "public/profile_episode.nfo");
// const template_season = path.resolve(process.cwd(), "public/profile_season.nfo");
// const template_series = path.resolve(process.cwd(), "public/profile_tvshow.nfo");
// const template_subtitle = path.resolve(process.cwd(), "public/template_subtitle.vtt");

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
  const dir = path.resolve(os.homedir(), "Documents/workspaces/medias");
  const manage = new FileManage({ root: dir });
  const r = await LocalFileDriveClient.Get({
    unique_id: dir,
    store,
  });
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  const client = r.data;
  // const r3 = await client.create_folder({ name: "大理寺少卿游", parent_file_id: "root" });
  // if (r3.error) {
  //   console.log(r3.error.message);
  //   return;
  // }
  // const r3 = await client.upload(video_filepath, { name: "大理寺少卿游.S01E01.mp4", parent_file_id: "root" });
  // if (r3.error) {
  //   console.log(r3.error.message);
  //   return;
  // }
  // const r3 = await client.upload(template_img, {
  //   name: "大理寺少卿游.S01E01.jpg",
  //   parent_file_id: path.resolve(client.root_folder.id, "江户前精灵"),
  // });
  // if (r3.error) {
  //   console.log(r3.error.message);
  //   return;
  // }
  const rr = await AliyunDriveClient.Get({ unique_id: "880986603", store });
  if (rr.error) {
    console.log(rr.error.message);
    return;
  }
  const client1 = rr.data;
  // await client1.init();
  // const rr2 = await client1.ping();
  // if (rr2.error) {
  //   console.log(rr2.error.message);
  //   return;
  // }
  // console.log(rr2.data);
  // return;
  const drive = await store.prisma.drive.findFirst({
    where: {
      type: DriveTypes.AliyunResourceDrive,
    },
  });
  if (!drive) {
    console.log("请先添加一个云盘");
    return;
  }
  // console.log("drive is ", drive);
  const SHARE_FOLDER = {
    /** 春色寄情人  */
    jiqingren: "https://www.alipan.com/s/BLKoFj39Wx9",
    /** 第一神拳  */
    diyishenquan: "https://www.aliyundrive.com/s/ACC1V8t18jg",
    /** 微暗之火 */
    weianzhihuo: "https://www.alipan.com/s/3AvVWwe5fRu",
    /** 驯鹿宝贝 */
    xunlubaobei: "https://www.alipan.com/s/pkqHFZe71MJ",
  };
  const url = SHARE_FOLDER.jiqingren;
  const r2 = await AliyunShareResourceClient.Get({ id: drive.id, url, store });
  if (r2.error) {
    console.log(r2.error.message);
    return;
  }
  // console.log(r2.data);
  // return;
  const resource_client = r2.data;
  const resource_folder = new Folder("root", {
    name: resource_client.name,
    client: resource_client,
  });
  const r3 = await resource_folder.walk(async (file) => {
    const { id, name, type, parents } = file;
    // 这里 slice(1) 是因为拼上了资源文件夹根文件夹，和根文件夹内的文件夹名称发生了重复
    const filepath = [...parents.slice(1)].map((p) => p.name).join("/");
    const parent_file_id = path.resolve(client.root_folder.id, filepath);
    // console.log(type, [filepath, name].filter(Boolean).join("/"));
    if (type === "file") {
      if (is_video_file(name)) {
        const template_video = (() => {
          if (name.match(/\.[mM][kK][vV]$/)) {
            return template_mkv_video;
          }
          return template_mp4_video;
        })();
        const r = await client.upload(template_video, {
          name,
          parent_file_id,
        });
        if (r.error) {
          console.log("上传视频失败", r.error.message);
        }
        return true;
      }
      if (is_img_file(name)) {
        const r1 = await resource_client.download(id);
        if (r1.error) {
          console.log("获取图片文件下载路径失败，因为", r1.error.message);
          return true;
        }
        if (!r1.data.url) {
          console.log("获取图片文件下载路径失败，不存在下载地址");
          return true;
        }
        const filename = path.resolve(parent_file_id, name);
        const r2 = await manage.download(r1.data.url, filename, {
          is_fullpath: true,
        });
        if (r2.error) {
          console.log("上传图片文件失败", r2.error.message);
        }
        return true;
      }
      if (is_subtitle_file(name)) {
        const r1 = await resource_client.download(id);
        if (r1.error) {
          console.log("获取字幕文件下载路径失败，因为", r1.error.message);
          return true;
        }
        if (!r1.data.url) {
          console.log("获取字幕文件下载路径失败，不存在下载地址");
          return true;
        }
        const filename = path.resolve(parent_file_id, name);
        const r2 = await manage.download(r1.data.url, filename, {
          is_fullpath: true,
        });
        if (r2.error) {
          console.log("上传字幕文件失败", r2.error.message);
        }
        return true;
      }
      if (is_nfo_file(name)) {
        const r1 = await resource_client.download(id);
        if (r1.error) {
          console.log("获取nfo文件下载路径失败，因为", r1.error.message);
          return true;
        }
        if (!r1.data.url) {
          console.log("获取nfo文件下载路径失败，不存在下载地址");
          return true;
        }
        const filename = path.resolve(parent_file_id, name);
        const r2 = await manage.download(r1.data.url, filename, {
          is_fullpath: true,
        });
        if (r2.error) {
          console.log("上传字幕文件失败", r2.error.message);
        }
        return true;
      }
      return true;
    }
    if (type === "folder") {
      const r = await client.create_folder({
        name,
        parent_file_id,
      });
      if (r.error) {
        console.log("创建文件夹失败", r.error.message);
        return true;
      }
    }
    return true;
  });
  if (r3.error) {
    console.log(r3.error.message);
    return;
  }
  console.log("Completed");
})();
