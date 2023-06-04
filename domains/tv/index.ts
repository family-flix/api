import path from "path";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { ImageUploader } from "@/domains/uploader";
import { r_id } from "@/utils";
import { store_factory } from "@/store";
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
    this.upload = new ImageUploader();
  }

  /** 上传海报 */
  async upload_poster(original_path: string) {
    const filename = `${r_id()}.jpg`;
    const key = `/poster/${filename}`;
    const filepath = path.join(this.assets, key);
    const r = await this.upload.download(original_path, filepath);
    if (r.error) {
      return Result.Ok({
        img_path: key,
      });
    }
    return Result.Ok({
      img_path: key,
    });
  }

  async snapshot_media(body: {
    file_id?: string;
    cur_time: number;
    drive_id: string;
    store: ReturnType<typeof store_factory>;
  }) {
    const { file_id, cur_time: original_cur_time, drive_id, store } = body;
    if (!file_id) {
      return Result.Ok(null);
    }
    const cur_time = format_number_with_3decimals(original_cur_time);
    const client = new AliyunDriveClient({ drive_id, store });
    const thumbnail_res = await client.generate_thumbnail({ file_id, cur_time: cur_time.replace(".", "") });
    if (thumbnail_res.error) {
      return Result.Ok(null);
    }
    const filename = `${r_id()}.jpg`;
    const key = `/thumbnails/${filename}`;
    const filepath = path.join(this.assets, key);
    const r = await this.upload.download(thumbnail_res.data.responseUrl, filepath);
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
    const filepath = path.join(this.assets, key);
    return this.upload.delete(filepath);
  }
}
