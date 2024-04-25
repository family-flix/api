/**
 * @file 获取影片产地信息可选项
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { User } from "@/domains/user";
import { store } from "@/store";

/**
 * @doc https://www.iso.org/standard/63545.html
 */
enum MediaSource {
  US = "USA", // 美国 (United States)
  CN = "CHN", // 中国 (China)
  TW = "TWN", // 中国台湾 (Taiwan)
  HK = "HKG", // 中国香港 (Hong Kong)
  JP = "JPN", // 日本 (Japan)
  DE = "DEU", // 德国 (Germany)
  GB = "GBR", // 英国 (United Kingdom)
  FR = "FRA", // 法国 (France)
  IT = "ITA", // 意大利 (Italy)
  BR = "BRA", // 巴西 (Brazil)
  CA = "CAN", // 加拿大 (Canada)
  AU = "AUS", // 澳大利亚 (Australia)
  IN = "IND", // 印度 (India)
  RU = "RUS", // 俄罗斯 (Russia)
  KR = "KOR", // 韩国 (South Korea)
  ES = "ESP", // 西班牙 (Spain)
  MX = "MEX", // 墨西哥 (Mexico)
  ID = "IDN", // 印度尼西亚 (Indonesia)
  TR = "TUR", // 土耳其 (Turkey)
  SA = "SAU", // 沙特阿拉伯 (Saudi Arabia)
  ZA = "ZAF", // 南非 (South Africa)
  AR = "ARG", // 阿根廷 (Argentina)
  TH = "THA", // 泰国 (Thailand)
  EG = "EGY", // 埃及 (Egypt)
  NL = "NLD", // 荷兰 (Netherlands)
  CH = "CHE", // 瑞士 (Switzerland)
  SE = "SWE", // 瑞典 (Sweden)
  PL = "POL", // 波兰 (Poland)
  PK = "PAK", // 巴基斯坦 (Pakistan)
  NG = "NGA", // 尼日利亚 (Nigeria)
  MY = "MYS", // 马来西亚 (Malaysia)
  BD = "BGD", // 孟加拉国 (Bangladesh)
}

const MediaSourceTexts: Record<MediaSource, string> = {
  [MediaSource.CN]: "中国",
  [MediaSource.TW]: "中国台湾",
  [MediaSource.HK]: "中国香港",
  [MediaSource.JP]: "日本",
  [MediaSource.KR]: "韩国",
  [MediaSource.US]: "美国",
  [MediaSource.GB]: "英国",
  [MediaSource.FR]: "法国",
  [MediaSource.IT]: "意大利",
  [MediaSource.BR]: "巴西",
  [MediaSource.DE]: "德国",
  [MediaSource.CA]: "加拿大",
  [MediaSource.AU]: "澳大利亚",
  [MediaSource.IN]: "印度",
  [MediaSource.RU]: "俄罗斯",
  [MediaSource.ES]: "西班牙",
  [MediaSource.MX]: "墨西哥",
  [MediaSource.ID]: "印度尼西亚",
  [MediaSource.TR]: "土耳其",
  [MediaSource.SA]: "沙特阿拉伯",
  [MediaSource.ZA]: "南非",
  [MediaSource.AR]: "阿根廷",
  [MediaSource.TH]: "泰国",
  [MediaSource.EG]: "埃及",
  [MediaSource.NL]: "荷兰",
  [MediaSource.CH]: "瑞士",
  [MediaSource.SE]: "瑞典",
  [MediaSource.PL]: "波兰",
  [MediaSource.PK]: "巴基斯坦",
  [MediaSource.NG]: "尼日利亚",
  [MediaSource.MY]: "马来西亚",
  [MediaSource.BD]: "孟加拉国",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page: 1,
      pag_size: 20,
      total: 249,
      no_more: false,
      list: Object.keys(MediaSourceTexts).map((k) => {
        return {
          value: k,
          label: MediaSourceTexts[k as unknown as MediaSource],
        };
      }),
    },
  });
}
