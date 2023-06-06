/**
 * @file 管理后台/关联一个分享资源
 * 用于定时从该分享资源转存新增的视频文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    id,
    page: page_str = "1",
    page_size: page_size_str = "20",
    name,
  } = req.query as Partial<{
    id: string;
    page: string;
    page_size: string;
    name: string;
  }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
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
  const files_in_progress = await store.prisma.shared_file_in_progress.findMany({
    where: {
      OR: parsed_tvs.map((t) => {
        return {
          name: {
            contains: t.file_name || undefined,
          },
        };
      }),
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      options: files_in_progress,
    },
  });
}
