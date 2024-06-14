/**
 * @file 代理请求
 */
import url_utils from "url";

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { Result } from "@/domains/result/index";
import { RequestCore } from "@/domains/request/index";
import { HttpClientCore } from "@/domains/http_client/index";
import { connect } from "@/domains/http_client/provider.axios";
import { response_error_factory } from "@/utils/server";

export default async function v0_proxy(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { url } = req.query as Partial<{
    url: string;
  }>;
  //   const { authorization } = req.headers;
  //   const t_res = await User.New(authorization, store);
  //   if (t_res.error) {
  //     return e(t_res);
  //   }
  //   const user = t_res.data;
  if (!url) {
    return e(Result.Err("缺少 Url 参数"));
  }
  const u = decodeURIComponent(url);
  if (!u.startsWith("http")) {
    return e(Result.Err("Url 必须是以 http 开头的地址"));
  }
  const client = new HttpClientCore();
  connect(client);
  const request = new RequestCore(
    () => {
      return {
        method: "GET",
        url: u,
      };
    },
    { client }
  );
  const r = await request.run();
  if (r.error) {
    return e(r);
  }
  const text = r.data as any as string;
  if (!text.match(/EXTINF/)) {
    return e(Result.Err("内容不正常"));
  }
  const result: string[] = [];
  const lines = text.split("\n").filter(Boolean);
  //   const rrr = url_utils.parse(u);
  //   const { protocol, hostname, host, port } = rrr;
  //   console.log("[]", u, rrr);
  //   for (let i = 0; i < lines.length; i += 1) {
  //     (() => {
  //       const prev = lines[i - 1];
  //       const cur = lines[i];
  //       if (!cur) {
  //         return;
  //       }
  //       if (!prev) {
  //         return;
  //       }
  //       if (!prev.match(/EXTINF/)) {
  //         result.push(prev);
  //         return;
  //       }
  //       result.push(prev);
  //       result.push([`${protocol}://${hostname}:${port}`, cur].join("/"));
  //       i + 2;
  //     })();
  //   }
  return res.status(200).body(text);
  //   return res.status(200).body(result.join("\n"));
}
