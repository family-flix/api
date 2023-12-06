import fs from "fs";

import axios from "axios";

import { utils } from "./utils";
import { Result } from "@/types";

export class TencentDoc {
  url: string;

  constructor(props: { url: string }) {
    const { url } = props;
    this.url = url;
  }

  async fetch() {
    try {
      const response = await axios.get("https://docs.qq.com/dop-api/opendoc", {
        params: {
          u: "",
          id: "DQmx1WEdTRXpGeEZ6",
          normal: "1",
          outformat: "1",
          noEscape: "1",
          commandsFormat: "1",
          preview_token: "",
          doc_chunk_flag: "1",
        },
        headers: {
          authority: "docs.qq.com",
          accept: "*/*",
          "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
          cookie:
            "traceid=f58e9e9a2a; TOK=f58e9e9a2a5b1fb3; hashkey=f58e9e9a; fingerprint=bda962d5d0bf4f97b1d7574ef554d09236; ES2=d5d6f514f7c5bb72; optimal_cdn_domain=docs2.gtimg.com; qq_domain_video_guid_verify=06d4b0c34de022a0; video_platform=2; pgv_info=ssid=s3182795469; pgv_pvid=5828334128; qm_authimgs_id=0; qm_verifyimagesession=h0134602cabb6aab012201e9e06ef81173a6893ad73fcba4f822ccd57ecdd36d2c0584988845dcea7ad; _clck=1415ah1|1|fgh|0; pac_uid=0_72f5ef48fc3ca; iip=0; _qimei_uuid42=17b0c1414331009ec7ae24d6314567973d4fe650a3; _qimei_fingerprint=63b90c80ee2ac4e28b279bd5e4e0209d; _qimei_q36=; _qimei_h38=e963bd76c7ae24d6314567970300000c117b0c; low_login_enable=1; wx_appid=wxd45c635d754dbf59; openid=oDzL40HOCXRqfCD_Eb3uFRCjjfNw; env_id=gray-pct25; access_token=74_N4v6KV5SAa7-8PymcCL6Hzr61uAJ1yFlkIAPLdkY7s5P5h8vMNMmwmuAER-bJvuVIh5S3EMCbI-TmAwvvzagh3JD2ZjZfvigZW-5kHo-zOI; refresh_token=74_WTt6b3GRICvJ5P0kZka1nU84WG3g131N8_4N_7hUFpZqBb49-36e-pTbzEEBuBwBWwSizX5SIYPA8MdNYEixQqsYCzz1sU6NqGcU-um09RU",
          referer: "https://docs.qq.com/doc/DQmx1WEdTRXpGeEZ6",
          "sec-ch-ua": '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "script",
          "sec-fetch-mode": "no-cors",
          "sec-fetch-site": "same-origin",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        },
      });
      const { data } = response;
      const {
        clientVars: {
          collab_client_vars: {
            globalPadId,
            initialAttributedText: { text },
          },
        },
      } = data;
      if (!text[0]) {
        return Result.Err("缺少数据");
      }
      return this.parse_text(text[0]);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  }

  parse_text(text: {
    chunks: {
      index: number;
      command: string;
    }[];
    revision_version: string;
    total: number;
  }) {
    const { chunks, revision_version, total } = text;
    let result: { name: string; link: string }[] = [];
    for (let i = 0; i < chunks.length; i += 1) {
      (() => {
        const { index, command } = chunks[i];
        const r = utils.preview(command);
        if (r.length === 0) {
          return;
        }
        for (let j = 0; j < r.length; j += 1) {
          const t = r[i] as { text: string };
          const { text } = t;
          const lines = text
            .split("\r")
            .filter(Boolean)
            .filter((text) => {
              const m = text.match(/\x07(\x13|\x06)(\x13|\x06){0,1}HYPERLINK.{1,}\x15/);
              if (m) {
                return true;
              }
              return false;
            })
            .map((text) => {
              const name_r = /\x14(.{1,})\x15/;
              const link_r = /HYPERLINK (.{1,}) normalLink \\tdfe/;
              const name = text.match(name_r);
              const link = text.match(link_r);
              if (!name || !link) {
                return null;
              }
              const n = name[1];
              return {
                origin_name: n,
                name: n
                  .replace(/\[[0-9]{4}\]$/, "")
                  .replace(/第[一二三四五六七八九十]季/, "")
                  .trim(),
                link: link[1],
              };
            })
            .filter(Boolean) as { name: string; link: string }[];
          result = result.concat(lines);
        }
      })();
    }
    return Result.Ok(result);
  }
}
