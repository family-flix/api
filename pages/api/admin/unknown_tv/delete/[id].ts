/**
 * @file 管理后台/删除指定电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id } = user;
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

  const episode_where: NonNullable<Parameters<typeof store.prisma.parsed_episode.findMany>[number]>["where"] = {
    parsed_tv_id: id,
    user_id,
  };
  const episode_count = await store.prisma.parsed_episode.count({ where: episode_where });
  do {
    const list = await store.prisma.parsed_episode.findMany({
      where: episode_where,
      skip: (page - 1) * page_size,
      take: page_size,
    });
    no_more = list.length + (page - 1) * page_size >= episode_count;
    page += 1;
    for (let i = 0; i < list.length; i += 1) {
      const episode = list[i];
      const { id, file_id, drive_id } = episode;
      if (file_id) {
        const drive_res = await Drive.Get({ id: drive_id, user, store });
        if (drive_res.error) {
          continue;
        }
        const client = drive_res.data.client;
        const r = await client.to_trash(file_id);
        if (r.error) {
          has_error = true;
          continue;
        }
      }
      if (has_error) {
        continue;
      }
      const r = await store.delete_parsed_episode({ id });
      if (r.error) {
        has_error = true;
      }
    }
  } while (no_more === false);

  if (has_error) {
    return e("删除过程出现错误，请重新删除");
  }

  page = 1;
  no_more = false;

  const season_where: NonNullable<Parameters<typeof store.prisma.parsed_season.findMany>[number]>["where"] = {
    parsed_tv_id: id,
    user_id,
  };
  const season_count = await store.prisma.parsed_season.count({ where: season_where });
  do {
    const list = await store.prisma.parsed_season.findMany({
      where: season_where,
      skip: (page - 1) * page_size,
      take: page_size,
    });
    no_more = list.length + (page - 1) * page_size >= season_count;
    page += 1;
    for (let i = 0; i < list.length; i += 1) {
      const season = list[i];
      const { id, file_id, drive_id } = season;
      if (file_id) {
        const drive_res = await Drive.Get({ id: drive_id, user, store });
        if (drive_res.error) {
          continue;
        }
        const client = drive_res.data.client;
        const r = await client.to_trash(file_id);
        if (r.error) {
          has_error = true;
          continue;
        }
      }
      if (has_error) {
        continue;
      }
      const r = await store.delete_parsed_season({ id });
      if (r.error) {
        has_error = true;
      }
    }
  } while (no_more === false);

  if (has_error) {
    return e("删除过程出现错误，请重新删除");
  }

  await store.prisma.parsed_tv.delete({
    where: {
      id,
    },
  });

  res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
