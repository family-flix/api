import { HttpClientCore } from "@/domains/http_client/index";
import { connect } from "@/domains/http_client/provider.axios";
import { RequestCoreV2 } from "@/domains/request";
import { Result } from "@/types/index";

import { fetch_torrent_detail, fetch_torrent_download_link, search_media } from "./services";

export class MTeamPTClient {
  client: HttpClientCore;
  $search: RequestCoreV2<{ fetch: typeof search_media; client: HttpClientCore }>;
  $profile: RequestCoreV2<{ fetch: typeof fetch_torrent_detail; client: HttpClientCore }>;
  $download: RequestCoreV2<{ fetch: typeof fetch_torrent_download_link; client: HttpClientCore }>;

  constructor() {
    const _client = new HttpClientCore({
      hostname: "",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        cookie:
          "auth=eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJsaXRhbyIsInVpZCI6MzEwNTI5LCJqdGkiOiIyMjEwMGI2YS0xY2E4LTQ3YWMtYjY2OS1kZDNiN2M3ZGNlNWMiLCJpc3MiOiJodHRwczovL2twLm0tdGVhbS5jYyIsImlhdCI6MTcxMTg1NTE3NiwiZXhwIjoxNzE0NDQ3MTc2fQ.-SInGAP4loApjHdFwmiXw4CJnT3KuuRH36K1SZA2nOmuUtdTcwckgOCcefHnz2AvGR-JuByQK_POHv2o1ahCMg",
        origin: "https://kp.m-team.cc",
        priority: "u=1, i",
        referer: "https://kp.m-team.cc/detail/775381",
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        ts: "1713680156",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    connect(_client);
    const client = {
      async get<T>(...args: Parameters<typeof _client.get>) {
        const r = await _client.get<{ code: string; message: string; data: T }>(...args);
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const { code, message, data } = r.data;
        if (Number(code) !== 0) {
          return Result.Err(message);
        }
        return Result.Ok(data);
      },
      async post<T>(...args: Parameters<typeof _client.post>) {
        const r = await _client.post<{ code: string; message: string; data: T }>(...args);
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const { code, message, data } = r.data;
        if (Number(code) !== 0) {
          return Result.Err(message);
        }
        return Result.Ok(data);
      },
    };
    // @ts-ignore
    this.client = client;

    this.$search = new RequestCoreV2({
      fetch: search_media,
      client: this.client,
    });
    this.$download = new RequestCoreV2({
      fetch: fetch_torrent_download_link,
      client: this.client,
    });
    this.$profile = new RequestCoreV2({
      fetch: fetch_torrent_detail,
      client: this.client,
    });
  }
}
