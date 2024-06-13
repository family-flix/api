import axios from "axios";

import { Application } from "@/domains/application/index";
import { QuarkDriveClient } from "@/domains/clients/quark/index";

// (async () => {
//   const response = await axios.post(
//     "https://drive-pc.quark.cn/1/clouddrive/file/v2/play",
//     {
//       fid: "a9a86cceb4874221926032c04e31aa23",
//       resolutions: "normal,low,high,super,2k,4k",
//       supports: "fmp4,m3u8",
//     },
//     {
//       params: {
//         pr: "ucpro",
//         fr: "pc",
//         uc_param_str: "",
//       },
//       headers: {
//         accept: "application/json, text/plain, */*",
//         "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
//         "content-type": "application/json;charset=UTF-8",
//         cookie:
//           "_UP_A4A_11_=wb965140c41f4eff9e8085c2a25496d3; _UP_30C_6A_=st9656201b8ld2vv125juamu27llms8m; _UP_TS_=sg197f45b2912abd70943a7c51f9bed2ba7; _UP_E37_B7_=sg197f45b2912abd70943a7c51f9bed2ba7; _UP_TG_=st9656201b8ld2vv125juamu27llms8m; _UP_335_2B_=1; tfstk=fS8ENBsUCavscW-lQO_PQKn2gT_dzZHXxU65ZQAlO9XhOwOkbQOq9_9BZT-PILhLRwDLrTAvBM6HFwwrzd7h2H65dT7ywKlshqgX9BQRoxMjl38hQTbAtyfuFGjGi39Rtk3X9BFMXK_P4qZz16SrUTvlxGfGZO2lr9bo_OfPMu2HEacwsOC5tkXhECAGis5osX8DyR55xvhoWFZZpbshnBXHOp8ipMqpsOzurF-NYtDPQz4k76ROBZdT-qWMA3YCSeDgeNAvfpfNu2yAThA2QiT_Cz_DDd8PmZoS9ZYpZnKkTVkcbnJMD1KtUuW2qBtv5MP4YaTese19USqBsgx6JiLIIy7DDB_BqKD_A9x2qesdyJSrC8CiLT8JY8qlx1CNhfliZxp1tp7hbcr82Mhd_tGhxuERxt1Nhfla2uIpm1WjtMf..; _UP_D_=pc; __pus=251cc95b68305c3068849cd709c2fe69AATosz7ayQV97l0sTAidY68EKSesA3P5QsfVKfuL0rsNZQLBMHasgZYaEYO6dVOsTHztBjKkONZQ3fTTZSJ//xa4; __kp=456f2fd0-2864-11ef-9572-639414945abf; __kps=AARSkxQqOKBEID5PUB4pg2lt; __ktd=i01zXsmiwy9A4la/5wsvYA==; __uid=AARSkxQqOKBEID5PUB4pg2lt; __puus=72a06bddc5e0b9277ae6bbc6140efffaAASJK8gRX2S5hCc097Sia8h2lnVGLQWGkp+SJu3c8NRnmGK2yTd2tYatWSCui3m95ORALKllb4vYvrovMRrMvHROS3ku9PLFfPmVxdAm5yuH03KGoVH5mExUDlB9CEFgQEW1ey2chzn0VUeSMGGs0NH+3+vaq93S+LzDzEAdyUjHB5hmlNy1SYGMspyLfIhCEs/cdtEdi2I6ZSx5KVDJedeg; Video-Auth=55PinJmcU4BikYhwgTriETpfAgQ9wknVjZV1/DDChgD9znDbJFCv3hCFKt6d+zaPEOqNk4KQBQdZ//LE0CTqPQ==",
//         origin: "https://pan.quark.cn",
//         priority: "u=1, i",
//         referer: "https://pan.quark.cn/",
//         "sec-ch-ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
//         "sec-ch-ua-mobile": "?0",
//         "sec-ch-ua-platform": '"macOS"',
//         "sec-fetch-dest": "empty",
//         "sec-fetch-mode": "cors",
//         "sec-fetch-site": "same-site",
//         "user-agent":
//           "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
//       },
//     }
//   );
//   console.log(response.data);
// })();

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
  const original_drive_res = await QuarkDriveClient.Get({ unique_id: "0ae08de8-9fa3-cde8-b24b-148f3c20a3dd", store });
  if (original_drive_res.error) {
    console.log(original_drive_res.error.message);
    return;
  }
  const original_client = original_drive_res.data;
  const file_id = "a9a86cceb4874221926032c04e31aa23";
  // const r = await original_client.fetch_video_preview_info(file_id);
  const r = await original_client.fetch_parent_paths(file_id);
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data);
  console.log("Completed");
})();
