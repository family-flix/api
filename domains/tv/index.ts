import { AliyunDriveClient } from "@/domains/aliyundrive";
import { ImageUploader } from "@/domains/uploader";
import { DatabaseStore } from "@/domains/store";
import { r_id } from "@/utils";
import { Result } from "@/types";

import { format_number_with_3decimals } from "./utils";

export class TV {
  static New(options: { assets?: string }) {
    const { assets } = options;
    if (!assets) {
      return Result.Err("请传入资源根目录路径");
    }
    return Result.Ok(new TV({ assets }));
  }

  /** 资源存放根目录 */
  assets: string;
  upload: ImageUploader;

  constructor(options: { assets: string }) {
    const { assets } = options;

    this.assets = assets;
    this.upload = new ImageUploader({ root: assets });
  }

  /** 上传海报 */
  async upload_poster(original_path: string) {
    const filename = `${r_id()}.jpg`;
    const key = `/poster/${filename}`;
    const r = await this.upload.download(original_path, key);
    if (r.error) {
      return Result.Ok({
        img_path: key,
      });
    }
    return Result.Ok({
      img_path: key,
    });
  }
  async snapshot_media(body: { file_id?: string; cur_time: number; drive_id: number; store: DatabaseStore }) {
    const { file_id, cur_time: original_cur_time, drive_id, store } = body;
    if (!file_id) {
      return Result.Ok(null);
    }
    const cur_time = format_number_with_3decimals(original_cur_time);
    const client_res = await AliyunDriveClient.Get({ drive_id, store });
    if (client_res.error) {
      return Result.Ok(null);
    }
    const client = client_res.data;
    const thumbnail_res = await client.generate_thumbnail({ file_id, cur_time: cur_time.replace(".", "") });
    if (thumbnail_res.error) {
      return Result.Ok(null);
    }
    const filename = `${r_id()}.jpg`;
    const key = `/thumbnails/${filename}`;
    // const filepath = path.join(this.assets, key);
    const r = await this.upload.download(thumbnail_res.data.responseUrl, key);
    if (r.error) {
      return Result.Ok(null);
    }
    return Result.Ok({
      original_path: thumbnail_res.data.responseUrl,
      img_path: key,
    });
  }
  /** 删除指定截图 */
  delete_snapshot(key: string) {
    // const filepath = path.join(this.assets, key);
    return this.upload.delete(key);
  }
}
