/**
 * @file 管理后台/删除指定电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { AliyunDriveClient } from "@/domains/aliyundrive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const tv_res = await store.find_parsed_tv({
    id,
    user_id,
  });
  if (tv_res.error) {
    return e(tv_res);
  }
  const tv = tv_res.data;
  if (tv === null) {
    return e("没有匹配的电视剧记录");
  }

  let has_error = false;
  let page = 1;
  let no_more = false;
  const page_size = 20;

  do {
    const list = await store.prisma.parsed_episode.findMany({
      where: {
        parsed_tv_id: id,
        user_id,
      },
      skip: (page - 1) * page_size,
      take: page_size,
    });
    // console.log("删除", list.length, "个剧集");
    no_more = list.length === 0;
    page += 1;
    for (let i = 0; i < list.length; i += 1) {
      const episode = list[i];
      const r = await store.delete_parsed_episode({ id: episode.id });
      if (r.error) {
        has_error = true;
      }
    }
  } while (no_more === false);

  if (has_error) {
    return e("删除 episodes 过程中出现错误");
  }

  page = 1;
  no_more = false;
  do {
    const list = await store.prisma.parsed_season.findMany({
      where: {
        parsed_tv_id: id,
        user_id,
      },
      skip: (page - 1) * page_size,
      take: page_size,
    });
    no_more = list.length === 0;
    page += 1;
    for (let i = 0; i < list.length; i += 1) {
      const season = list[i];
      const r = await store.delete_parsed_season({ id: season.id });
      if (r.error) {
        has_error = true;
      }
    }
  } while (no_more === false);

  if (has_error) {
    return e("删除 seasons 过程中发生错误");
  }

  await store.prisma.parsed_tv.delete({
    where: {
      id,
    },
  });

  res.status(200).json({
    code: 0,
    msg: "",
    data: null,
  });
}
