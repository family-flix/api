/**
 * @file 管理后台/关联一个分享资源
 * 用于定时从该分享资源转存新增的视频文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result, resultify } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const body = req.body as Partial<{ file_id: string; file_name: string; url: string }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
      user_id,
    },
    include: {
      profile: true,
      parsed_tvs: {
        where: {
          file_id: {
            not: null,
          },
        },
      },
    },
  });
  if (tv === null) {
    return e("没有匹配的电视剧记录");
  }
  const { parsed_tvs } = tv;
  if (parsed_tvs.length === 0) {
    // @todo 说明文档
    return e("该电视剧不存在视频文件");
  }
  if (parsed_tvs.length !== 1) {
    return e(Result.Err("该电视剧存在多个文件夹，请选择一个名字匹配的文件"));
  }
  const parsed_tv = parsed_tvs[0];
  const r = await resultify(store.prisma.bind_for_parsed_tv.create.bind(store.prisma.bind_for_parsed_tv))({
    data: {
      id: r_id(),
      file_id: body.file_id!,
      name: body.file_name!,
      url: body.url!,
      parsed_tv_id: parsed_tv.id,
      user_id,
    },
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: null,
  });
}
