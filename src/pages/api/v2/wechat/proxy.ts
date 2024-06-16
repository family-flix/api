/**
 * @file 代理请求
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Result } from "@/domains/result/index";
import { Member } from "@/domains/user/member";
import { RequestCore } from "@/domains/request/index";
import { HttpClientCore } from "@/domains/http_client/index";
import { connect } from "@/domains/http_client/provider.axios";
import { response_error_factory } from "@/utils/server";

export default async function v2_wechat_proxy(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { url } = req.query as Partial<{
    url: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
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
  return res.status(200).body(text);
}
