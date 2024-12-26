import { HttpClientCore } from "@/domains/http_client";
import { connect } from "@/domains/http_client/provider.axios";
import { RequestCore } from "@/domains/request";
import { request_factory } from "@/domains/request/utils";
import { AliyunDriveFileResp } from "@/domains/clients/alipan/types";

const API_HOST = "https://api.aliyundrive.com";

const client = new HttpClientCore();
connect(client);
const request = request_factory({
  hostnames: {
    prod: API_HOST,
  },
  headers: {
    Cookie:
      "_nk_=t-2213376065375-52; _tb_token_=5edd38eb839fa; cookie2=125d9fb93ba60bae5e04cf3a4f1844ce; csg=7be2d6ea; munb=2213376065375; t=cc514082229d35fa6e4cb77f9607a31a; isg=BPv7iSICHO8ckiBhqmD_qx8rgNtlUA9S5UNxz-241_oRTBsudSCfohmeYGIC92dK; l=Al1dbs-eO-pLLQIH1VDqMyQKbSJXe5HM; cna=XiFcHCbGiCMCAX14pqXhM/U9",
    "content-type": "application/json; charset=UTF-8",
    accept: "*/*",
    "x-umt": "xD8BoI9LPBwSmhKGWfJem6nHQ7xstNFA",
    "x-sign": "izK9q4002xAAJGGHrNSHxqaOJAfmJGGEYjdc0ltNpMTdx5GeaXDSRaCtwKwEG0Rt2xgVv6dPLJBixqXoMb0l07OzsyxxtGGEYbRhhG",
    "x-canary": "client=web,app=adrive,version=v4.9.0",
    "x-sgext":
      "JAdnylkEyyzme4p+deZ0j8pS+lbpVvxQ/FXpVvhV6UT7Uf1R/Fb7X/5V6Vf6V/xX+lf6V/pX+lf6V/pE+kT6RPpX6Vf6V/pE+kT6RPpE+kT6RPpE+kT6RPpX+lf6",
    "accept-language": "en-US,en;q=0.9",
    "x-mini-wua":
      "iMgQmyQ0xADdEBzKwoGPtradgjIKF60kuQM769eBYB2c50VY3P9sTHE9tE0cGiP5vuxcym4QSf7t9oByybyv6yjXYIVOyToCAp95eIvBq5wBbCWvYsWC59frqvGYDlw7wmbOPxp04i3dZUs3Af6Y2dQDY+TG5eOUXMeaMAT7qFkinOA==",
    "user-agent":
      "AliApp(AYSD/4.4.0) com.alicloud.smartdrive/4.4.0 Version/16.3 Channel/201200 Language/en-CN /iOS Mobile/iPhone12,3",
    referer: "https://aliyundrive.com/",
    origin: "https://aliyundrive.com/",
  },
});

export const get_share_by_anonymous = new RequestCore(
  (payload: { share_id: string; code?: string | null }) => {
    return request.post<{
      creator_id: string;
      share_name: string;
      share_title: string;
      file_infos: {
        file_id: string;
        file_name: string;
        type: "folder" | "file";
      }[];
    }>("/adrive/v2/share_link/get_share_by_anonymous", {
      share_id: payload.share_id,
      code: payload.code,
    });
  },
  { client }
);
export const get_share_token = new RequestCore(
  (payload: { share_id: string; code?: string | null }) => {
    return request.post<{
      share_token: string;
      expire_time: string;
      expires_in: number;
    }>("/v2/share_link/get_share_token", {
      share_id: payload.share_id,
      share_pwd: payload.code,
    });
  },
  { client }
);

export const list_by_share = new RequestCore(
  (payload: {
    /** 该文件夹下的文件列表，默认 root 表示根目录 */
    file_id: string;
    share_id: string;
    token: string;
    options: Partial<{
      /** 每页数量 */
      page_size: number;
      /** 下一页标志 */
      marker: string;
      sort: { field: "name" | "updated_at" | "size"; order: "asc" | "desc" }[];
    }>;
  }) => {
    const { file_id, share_id, token, options = {} } = payload;
    const { marker, page_size = 20 } = options;
    return request.post<{
      items: AliyunDriveFileResp[];
      next_marker: string;
    }>(
      "/adrive/v2/file/list_by_share",
      {
        image_thumbnail_process: "image/resize,w_256/format,jpeg",
        image_url_process: "image/resize,w_1920/format,jpeg/interlace,1",
        limit: page_size,
        order_by: "name",
        order_direction: "DESC",
        parent_file_id: file_id,
        marker,
        share_id,
        video_thumbnail_process: "video/snapshot,t_1000,f_jpg,ar_auto,w_256",
      },
      {
        headers: {
          "x-share-token": token,
        },
      }
    );
  },
  { client }
);

export const fetch_file = new RequestCore(
  (payload: { file_id: string; share_id: string; token: string }) => {
    return request.post<{
      drive_id: string;
      domain_id: string;
      file_id: string;
      share_id: string;
      name: string;
      type: string;
      created_at: string;
      updated_at: string;
      file_extension: string;
      mime_type: string;
      mime_extension: string;
      size: number;
      parent_file_id: string;
      thumbnail: string;
      category: string;
      video_media_metadata: {
        width: number;
        height: number;
        duration: string;
      };
      punish_flag: number;
      revision_id: string;
      ex_fields_info: {
        video_meta_processed: string;
      };
    }>(
      "/adrive/v2/file/get_by_share",
      {
        drive_id: "",
        fields: "*",
        file_id: payload.file_id,
        image_thumbnail_process: "image/resize,w_1920/format,jpeg",
        share_id: payload.share_id,
      },
      {
        headers: {
          "x-share-token": payload.token,
        },
      }
    );
  },
  { client }
);

export const search_files = new RequestCore(
  (payload: { keyword?: string; page_size: number; share_id: string; token: string }) => {
    return request.post<{
      items: AliyunDriveFileResp[];
    }>(
      "/recommend/v1/shareLink/search",
      {
        keyword: payload.token,
        limit: payload.page_size,
        order_by: "name DESC",
        share_id: payload.share_id,
      },
      {
        headers: {
          "x-share-token": payload.token,
        },
      }
    );
  },
  { client }
);

export const transfer_file_from_resource = new RequestCore(
  (payload: { file_id: string; target_file_id: string; unique_id: string; share_id: string; token: string }) => {
    return request.post(
      "/v2/file/copy",
      {
        file_id: payload.file_id,
        to_parent_file_id: payload.target_file_id,
        to_drive_id: String(payload.unique_id),
        share_id: payload.share_id,
      },
      {
        headers: {
          "x-share-token": payload.token,
        },
      }
    );
  },
  { client }
);

export const transfer_file_from_resource_batch = new RequestCore(
  (
    body: {
      requests: {
        body: {
          auto_rename: boolean;
          file_id: string;
          share_id: string;
          to_parent_file_id: string | undefined;
          to_drive_id: string;
        };
        headers: {
          "Content-Type": string;
        };
        id: string;
        method: string;
        url: string;
      }[];
      resource: string;
    },
    extra: { token: string }
  ) => {
    return request.post<{
      responses: {
        body: {
          code: string;
          message: string;
          async_task_id?: string;
          file_id: string;
          domain_id: string;
        };
        // 其实是 index
        id: string;
        status: number;
      }[];
    }>("/adrive/v2/batch", body, {
      headers: {
        "x-share-token": extra.token,
      },
    });
  },
  { client }
);

export const query_task_status = new RequestCore(
  (body: {
    requests: {
      body: {
        async_task_id: string;
      };
      headers: {
        "Content-Type": string;
      };
      id: string;
      method: string;
      url: string;
    }[];
    resource: string;
  }) => {
    return request.post<{
      responses: {
        body: {
          code: string;
          message: string;
          total_process: number;
          state: "Running" | "PartialSucceed" | "Succeed";
          async_task_id: string;
          consumed_process: number;
          status: "Running" | "PartialSucceed" | "Succeed";
        };
        id: string;
        status: number;
      }[];
    }>("/adrive/v2/batch", body, {
      // "x-share-token": this.share_token[share_id].token,
    });
  },
  { client }
);

export const create_share_link = new RequestCore(
  (body: {
    expiration: string;
    sync_to_homepage: boolean;
    share_pwd: string;
    drive_id: string;
    file_id_list: string[];
  }) => {
    return request.post<{
      share_url: string;
      file_id: string;
      display_name: string;
      file_id_list: string[];
    }>("/adrive/v2/share_link/create", body);
  },
  { client }
);

export const download_file = new RequestCore(
  (payload: { file_id: string; share_id: string; token: string }) => {
    return request.post<{
      download_url: string;
      url: string;
      thumbnail: string;
    }>(
      "/v2/file/get_share_link_download_url",
      {
        file_id: payload.file_id,
        // drive_id: String(this.unique_id),
        share_id: payload.share_id,
      },
      {
        headers: {
          "x-share-token": payload.token,
        },
      }
    );
  },
  { client }
);
