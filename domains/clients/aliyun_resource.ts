/**
 * 阿里云盘分享资源
 */
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { AliyunDriveProfile } from "@/domains/aliyundrive/types";
import { DatabaseStore } from "@/domains/store";
import { Result } from "@/types";
import { parseJSONStr } from "@/utils";

export class AliyunShareResourceClient implements AliyunDriveClient {
  store: DatabaseStore;
  share_id: string;
  url: string;
  code?: string;
  size = 10;

  client: AliyunDriveClient | null = null;
  constructor(props: { url: string; share_id: string; code?: string; store: DatabaseStore }) {
    const { url, share_id, code, store } = props;

    this.url = url;
    this.share_id = share_id;
    this.code = code;
    this.store = store;
  }
  // @ts-ignore
  async fetch_files(
    /** 该文件夹下的文件列表，默认 root 表示根目录 */
    file_id: string = "root",
    options: Partial<{
      /** 每页数量 */
      page_size: number;
      /** 下一页标志 */
      marker: string;
      sort: { field: "name" | "updated_at" | "size"; order: "asc" | "desc" }[];
    }> = {}
  ) {
    const { marker, page_size: size = 20 } = options;
    console.log("[DOMAIN]clients/aliyun_resource - fetch_files", file_id, marker);
    const r = await (async () => {
      if (this.client) {
        return Result.Ok(this.client);
      }
      // 取第一个云盘用来获取分享文件列表，不涉及转存逻辑
      const drive = await this.store.prisma.drive.findFirst({});
      if (!drive) {
        return Result.Err("请先添加一个云盘", 10002);
      }
      const p_res = parseJSONStr<AliyunDriveProfile>(drive.profile);
      if (p_res.error) {
        return Result.Err(p_res.error.message);
      }
      const { drive_id } = p_res.data;
      const client_res = await AliyunDriveClient.Get({ drive_id: String(drive_id), store: this.store });
      if (client_res.error) {
        return Result.Err(client_res.error.message);
      }
      const client = client_res.data;
      this.client = client;
      const r1 = await client.fetch_share_profile(this.url, {
        code: this.code,
      });
      if (r1.error) {
        if (r1.error.message.includes("share_link is cancelled by the creator")) {
          return Result.Err("分享链接被取消");
        }
        return Result.Err(r1.error.message);
      }
      return Result.Ok(this.client);
    })();
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const client = r.data;
    const r2 = await client.fetch_shared_files(file_id, {
      marker,
      share_id: this.share_id,
    });
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    return Result.Ok(r2.data);
  }
  // @ts-ignore
  async fetch_file(file_id: string) {
    const r = await (async () => {
      if (this.client) {
        return Result.Ok(this.client);
      }
      // 取第一个云盘用来获取分享文件列表，不涉及转存逻辑
      const drive = await this.store.prisma.drive.findFirst({});
      if (!drive) {
        return Result.Err("请先添加一个云盘", 10002);
      }
      const p_res = parseJSONStr<AliyunDriveProfile>(drive.profile);
      if (p_res.error) {
        return Result.Err(p_res.error.message);
      }
      const { drive_id } = p_res.data;
      const client_res = await AliyunDriveClient.Get({ drive_id: String(drive_id), store: this.store });
      if (client_res.error) {
        return Result.Err(client_res.error.message);
      }
      const client = client_res.data;
      this.client = client;
      const r1 = await client.fetch_share_profile(this.url, {
        code: this.code,
      });
      if (r1.error) {
        if (r1.error.message.includes("share_link is cancelled by the creator")) {
          return Result.Err("分享链接被取消");
        }
        return Result.Err(r1.error.message);
      }
      return Result.Ok(this.client);
    })();
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const client = r.data;
    console.log("[DOMAIN]client/aliyun_resource - fetch_file", file_id, this.share_id);
    const r2 = await client.fetch_shared_file(file_id, {
      share_id: this.share_id,
    });
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    return Result.Ok(r2.data);
  }
}
