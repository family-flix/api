/**
 * @file 一个云盘文件视频截图工具
 */
import { FileManage } from "@/domains/uploader";
import { DatabaseStore } from "@/domains/store";
import { Drive } from "@/domains/drive";
import { r_id } from "@/utils";
import { Result } from "@/types";

import { format_number_with_3decimals } from "./utils";

export class MediaThumbnail {
  static New(options: { assets?: string }) {
    const { assets } = options;
    if (!assets) {
      return Result.Err("请传入资源根目录路径");
    }
    return Result.Ok(new MediaThumbnail({ assets }));
  }

  /** 资源存放根目录 */
  assets: string;

  $upload: FileManage;

  constructor(options: { assets: string }) {
    const { assets } = options;

    this.assets = assets;
    this.$upload = new FileManage({ root: assets });
  }

  /** 上传海报 */
  async upload_poster(original_path: string) {
    const filename = `${r_id()}.jpg`;
    const key = `/poster/${filename}`;
    const r = await this.$upload.download(original_path, key);
    if (r.error) {
      return Result.Ok({
        img_path: key,
      });
    }
    return Result.Ok({
      img_path: key,
    });
  }
  /** 对指定视频文件截取指定帧 */
  async snapshot_media(body: {
    file_id?: string;
    cur_time: number;
    drive: Drive;
    store: DatabaseStore;
    filename: (time: string) => string;
  }) {
    const { file_id, cur_time: original_cur_time, drive, store, filename } = body;
    if (!file_id) {
      return Result.Err("异常1");
    }
    const cur_time = format_number_with_3decimals(original_cur_time);
    const client = drive.client;
    const thumbnail_res = await client.generate_thumbnail({ file_id, cur_time: cur_time.replace(".", "") });
    if (thumbnail_res.error) {
      return Result.Err("异常2");
    }
    const name = filename(cur_time);
    const key = `/thumbnail/${name}.jpg`;
    // console.log("[DOMAIN]TV - snapshot - before download", key);
    // const filepath = path.join(this.assets, key);
    const r = await this.$upload.download(thumbnail_res.data.responseUrl, key);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    return Result.Ok({
      original_path: thumbnail_res.data.responseUrl,
      img_path: key,
    });
  }
  /** 删除指定截图 */
  delete_snapshot(key: string) {
    // const filepath = path.join(this.assets, key);
    return this.$upload.delete_file(key);
  }
}
