/**
 * @file 调用 阿里云盘TV 版获取 refresh_token 和 access_token
 * 代码来自 https://github.com/iLay1678/i-tools/blob/main/server/api/alipan-tv-token/generate_qr.ts
 */
import { request_factory } from "@/domains/request/utils";
import { RequestCore } from "@/domains/request";
import { Result } from "@/domains/result";
import { HttpClientCore } from "@/domains/http_client";
import { connect } from "@/domains/http_client/provider.axios";
import { parseJSONStr } from "@/utils/index";

import { getParams, decrypt } from "./decode";

const client = new HttpClientCore({ timeout: 12000, debug: false });
connect(client);
const request = request_factory({
  hostnames: {
    prod: "http://api.extscreen.com",
  },
  process<T>(r: Result<{ code: number; message: string; data: T }>) {
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const v = r.data;
    if (v.code !== 200) {
      return Result.Err(new Error(v.message));
    }
    return Result.Ok(v.data);
  },
});
const request2 = request_factory({
  hostnames: {
    prod: "https://openapi.alipan.com",
  },
  // debug: true,
  process<T>(r: Result<{ code: number; message: string; data: T }>) {
    if (r.error) {
      return Result.Err(r.error.message);
    }
    return Result.Ok(r.data);
  },
});
const $refresh = new RequestCore(
  (body, headers) => {
    return request.post<{ ciphertext: string; iv: string }>("/aliyundrive/v3/token", body, { headers });
  },
  { client }
);
const $qrcode = new RequestCore(
  (body: { scopes: string; width: number; height: number }) => {
    return request.post<{ qrCodeUrl: string; sid: string }>("/aliyundrive/qrcode", body, {
      headers: { "Content-Type": "application/json" },
    });
  },
  { client }
);
const $status = new RequestCore(
  (sid: string) => {
    return request2.get<{
      status: "WaitLogin" | "LoginSuccess" | "QRCodeExpired" | "ScanSuccess" | "LoginFailed";
      authCode?: string;
    }>(`/oauth/qrcode/${sid}/status`);
  },
  { client }
);

export class AlipanRefreshTokenProvider {
  /** 生成二维码用于登录 */
  async generateQRCode() {
    const body = {
      scopes: ["user:base", "file:all:read", "file:all:write"].join(","),
      width: 500,
      height: 500,
    };
    const r = await $qrcode.run(body);
    // console.log("[DOMAIN]alipan_token_provider", body, r);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    return Result.Ok(r.data);
  }

  /** 检查二维码登录状态 */
  async checkLoginStatus(sid: string) {
    const r = await $status.run(sid);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { status, authCode } = r.data;
    if (status === "LoginSuccess" && authCode) {
      const r2 = await this.fetchAccessToken({ code: authCode });
      if (r2.error) {
        return Result.Err(r2.error.message);
      }
      const { refresh_token, access_token } = r2.data;
      return Result.Ok({
        status: "LoginSuccess",
        refresh_token,
        access_token,
      });
    }
    return Result.Ok({
      status,
      refresh_token: "",
      access_token: "",
    });
  }
  /** 使用 refresh_token 获取新的 access_token */
  async fetchAccessToken(payload: Partial<{ code: string; refresh_token: string }>) {
    const t = Math.floor(Date.now() / 1000);
    const body = {
      ...getParams(t),
      ...payload,
      "Content-Type": "application/json",
    };
    const headers = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]));
    const r = await $refresh.run(body, headers);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { ciphertext, iv } = r.data;
    const r2 = parseJSONStr<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>(decrypt(ciphertext, iv, t));
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    const { access_token, refresh_token: new_refresh_token, expires_in } = r2.data;
    return Result.Ok({
      token_type: "Bearer",
      access_token,
      refresh_token: new_refresh_token,
      expires_in,
    });
  }
}
