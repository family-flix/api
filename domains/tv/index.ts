import path from "path";

import { store_factory } from "@/store";
import { Result } from "@/types";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { ImageUploader } from "@/domains/uploader";
import { r_id } from "@/utils";
import { qiniu_upload_online_file } from "@/utils/back_end";
import { format_number_with_3decimals } from "./utils";

export class TV {
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
      // console.log(thumbnail_res.error.message);
      return Result.Ok(null);
    }
    const upload = new ImageUploader();
    const filename = r_id() + ".jpg";
    const filepath = path.resolve(process.env.PUBLIC_PATH || "/", filename);
    const r = await upload.download(thumbnail_res.data.responseUrl, filepath);
    if (r.error) {
      // console.log(r.error.message);
      return Result.Ok(null);
    }
    //     const u = await qiniu_upload_online_file(thumbnail_res.data.responseUrl, `/thumbnails/${filename}`);
    //     if (u.error) {
    //       console.log(u.error.message);
    //       return Result.Err(u.error);
    //     }
    return Result.Ok({
      original_path: thumbnail_res.data.responseUrl,
      //       url: u.data.url,
      img_path: `/public/${filename}`,
    });
  }
}
